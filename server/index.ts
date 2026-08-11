import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { v4 as uuidv4 } from 'uuid';

// 优先使用系统安装的 ffmpeg，如果找不到再使用 installer 提供的路径
const getFFmpegPath = () => {
  if (process.platform === 'linux' && fs.existsSync('/usr/bin/ffmpeg')) {
    return '/usr/bin/ffmpeg';
  }
  return ffmpegInstaller.path;
};

const getFFprobePath = () => {
  if (process.platform === 'linux' && fs.existsSync('/usr/bin/ffprobe')) {
    return '/usr/bin/ffprobe';
  }
  return ffprobeInstaller.path;
};

ffmpeg.setFfmpegPath(getFFmpegPath());
ffmpeg.setFfprobePath(getFFprobePath());

console.log('FFmpeg path:', getFFmpegPath());
console.log('FFprobe path:', getFFprobePath());

const app = express();
const port = Number(process.env.PORT || 3005);
const remoteApiBase = 'https://api-web.kunqiongai.com';
const loginSecretKey = process.env.LOGIN_SECRET_KEY || '7530bfb1ad6c41627b0f0620078fa5ed';

interface Task {
  status: 'uploading' | 'pending' | 'converting' | 'completed' | 'failed';
  percent: number;
  outputFile?: string;
  downloadUrl?: string;
  error?: string;
}

const tasks = new Map<string, Task>();

const rootDir = process.cwd();
const uploadDir = path.join(rootDir, 'uploads');
const outputDir = path.join(rootDir, 'converted');
const distWebDir = fs.existsSync(path.join(rootDir, 'dist-web'))
  ? path.join(rootDir, 'dist-web')
  : path.join(rootDir, 'dist-web-check');

for (const dir of [uploadDir, outputDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({ storage });

const linuxFontCandidates = [
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJKSC-Regular.otf',
  '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansCJKSC-Regular.otf',
];

const resolveDrawtextFontFile = () => {
  if (process.platform !== 'linux') return undefined;
  return linuxFontCandidates.find((fontPath) => fs.existsSync(fontPath));
};

const drawtextFontFile = resolveDrawtextFontFile();

const normalizeBitrate = (value?: string | number) => {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  const asString = String(value).trim();
  return /^\d+$/.test(asString) ? `${asString}k` : asString;
};

const escapeDrawtextValue = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,');

const unsupportedTypes = new Set(['video-watermark', 'remove-watermark', 'add-watermark']);

const locateInputFile = (requestedPath: string, id: string) => {
  const files = [
    ...fs.readdirSync(uploadDir).map((file) => ({ file, dir: uploadDir })),
    ...fs.readdirSync(outputDir).map((file) => ({ file, dir: outputDir })),
  ];
  const requestedInputFile =
    typeof requestedPath === 'string' && requestedPath.trim() ? path.basename(requestedPath.trim()) : '';
  return (
    files.find(({ file }) => file === requestedInputFile) ||
    files.find(({ file }) => file.startsWith(requestedInputFile.replace(path.extname(requestedInputFile), ''))) ||
    files.find(({ file }) => file.startsWith(id))
  );
};

const finalizeTaskSuccess = (task: Task, outputFilename: string) => {
  task.status = 'completed';
  task.percent = 100;
  task.outputFile = outputFilename;
  task.downloadUrl = `/download/${encodeURIComponent(outputFilename)}`;
};

const finalizeTaskError = (task: Task, error: Error) => {
  console.error('FFmpeg error:', error);
  task.status = 'failed';
  task.error = error.message;
};

const proxyRemoteApi = async (
  res: Response,
  pathname: string,
  options: {
    method?: 'GET' | 'POST';
    token?: string;
    body?: URLSearchParams;
  } = {},
) => {
  try {
    const response = await fetch(`${remoteApiBase}${pathname}`, {
      method: options.method || 'POST',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(options.token ? { token: options.token } : {}),
      },
      body: options.body?.toString(),
    });

    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json; charset=utf-8');
    res.send(await response.text());
  } catch (error) {
    console.error(`Remote API proxy failed for ${pathname}:`, error);
    res.status(502).json({ error: 'Remote API request failed' });
  }
};

const encodeSignedNonce = (payload: { nonce: string; timestamp: number; signature: string }) =>
  Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const generateSignedNonce = () => {
  const nonce = uuidv4().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${nonce}|${timestamp}`;
  const signature = crypto.createHmac('sha256', loginSecretKey).update(message, 'utf8').digest('base64');

  return {
    nonce,
    timestamp,
    signature,
  };
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/download', express.static(outputDir));

app.post('/api/login/signed-nonce', (_req: Request, res: Response) => {
  const signedNonce = generateSignedNonce();
  res.json({
    code: 1,
    msg: 'success',
    data: {
      signedNonce,
      encodedNonce: encodeSignedNonce(signedNonce),
    },
  });
});

app.post('/api/login/web-url', async (_req: Request, res: Response) => {
  await proxyRemoteApi(res, '/soft_desktop/get_web_login_url');
});

app.post('/api/login/poll-token', async (req: Request, res: Response) => {
  const clientNonce = String(req.body?.client_nonce || '');
  await proxyRemoteApi(res, '/user/desktop_get_token', {
    body: new URLSearchParams({
      client_type: 'desktop',
      client_nonce: clientNonce,
    }),
  });
});

app.post('/api/login/check', async (req: Request, res: Response) => {
  const token = String(req.body?.token || '');
  await proxyRemoteApi(res, '/user/check_login', {
    body: new URLSearchParams({ token }),
  });
});

app.post('/api/login/user-info', async (req: Request, res: Response) => {
  const token = String(req.body?.token || '');
  await proxyRemoteApi(res, '/soft_desktop/get_user_info', { token });
});

app.post('/api/login/logout', async (req: Request, res: Response) => {
  const token = String(req.body?.token || '');
  await proxyRemoteApi(res, '/logout', { token });
});

app.post('/api/login/custom-url', async (_req: Request, res: Response) => {
  await proxyRemoteApi(res, '/soft_desktop/get_custom_url');
});

app.post('/api/login/feedback-url', async (_req: Request, res: Response) => {
  await proxyRemoteApi(res, '/soft_desktop/get_feedback_url');
});

app.post('/api/upload', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    console.error('Upload failed: No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const taskId = path.basename(req.file.filename, path.extname(req.file.filename));
  console.log(`File uploaded: ${req.file.filename}, TaskID: ${taskId}`);
  tasks.set(taskId, { status: 'pending', percent: 0 });

  res.json({
    id: taskId,
    filename: req.file.filename,
    path: req.file.filename,
  });
});

app.post('/api/convert', async (req: Request, res: Response) => {
  const {
    id,
    format,
    settings,
    type,
    inputPath,
    outputPath,
    resolution,
    videoBitrate,
    audioBitrate,
    bitrate,
    frameRate,
    fps,
    sampleRate,
    startTime,
    duration,
    width,
    inputPaths,
  } = req.body || {};

  console.log(`Received convert request: ID=${id}, type=${type}, inputPath=${inputPath}`);

  const task = tasks.get(id);
  if (!task) {
    console.error(`Task not found for ID: ${id}`);
    return res.status(404).json({ error: 'Task not found' });
  }

  const resolvedFormat =
    format ||
    (typeof outputPath === 'string' && path.extname(outputPath).slice(1)) ||
    (type === 'video-to-gif' ? 'gif' : 'mp4');

  if (!id || !resolvedFormat) {
    console.error('Invalid request: Missing id or format');
    return res.status(400).json({ error: 'Missing id or format' });
  }

  if (unsupportedTypes.has(type)) {
    return res.status(400).json({ error: `Web version does not support "${type}" yet` });
  }

  const rawOutputName =
    typeof outputPath === 'string' && outputPath.trim()
      ? path.basename(outputPath.trim())
      : `${id}.${resolvedFormat}`;
  const outputFilename = rawOutputName || `${id}.${resolvedFormat}`;
  const outputFilePath = path.join(outputDir, outputFilename);

  if (fs.existsSync(outputFilePath)) {
    fs.unlinkSync(outputFilePath);
  }

  task.status = 'converting';
  task.percent = 0;
  task.error = undefined;
  task.outputFile = undefined;
  task.downloadUrl = undefined;

  let command: ffmpeg.FfmpegCommand;

  if (Array.isArray(inputPaths) && inputPaths.length > 1) {
    const resolvedInputFiles = inputPaths
      .map((input) => path.basename(String(input || '').trim()))
      .map((requested) =>
        locateInputFile(requested, id),
      )
      .filter((entry): entry is { file: string; dir: string } => Boolean(entry));

    if (resolvedInputFiles.length < 2) {
      return res.status(404).json({ error: 'Input files for merge not found' });
    }

    command = ffmpeg();
    resolvedInputFiles.forEach(({ file, dir }) => {
      command = command.input(path.join(dir, file));
    });

    // Concatenate multiple files in sequence for the web merge flow.
    command = command.outputOptions(['-filter_complex', `concat=n=${resolvedInputFiles.length}:v=1:a=1`]);
  } else {
    const inputEntry = locateInputFile(inputPath, id);
    if (!inputEntry) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    command = ffmpeg(path.join(inputEntry.dir, inputEntry.file));
  }

  if (startTime !== undefined && startTime !== null && startTime !== '') {
    command = command.setStartTime(Number(startTime));
  }

  if (duration !== undefined && duration !== null && duration !== '') {
    command = command.duration(Number(duration));
  }

  const resolvedResolution = settings?.resolution && settings.resolution !== 'auto'
    ? settings.resolution
    : resolution && resolution !== 'auto'
      ? resolution
      : undefined;

  if (resolvedResolution) {
    command = command.size(resolvedResolution);
  } else if (width && Number(width) > 0) {
    command = command.size(`${Number(width)}x?`);
  }

  const resolvedVideoCodec = settings?.videoCodec && settings.videoCodec !== 'auto'
    ? settings.videoCodec
    : undefined;
  if (resolvedVideoCodec) {
    command = command.videoCodec(resolvedVideoCodec);
  }

  const resolvedAudioCodec = settings?.audioCodec && settings.audioCodec !== 'auto'
    ? settings.audioCodec
    : undefined;
  if (resolvedAudioCodec) {
    command = command.audioCodec(resolvedAudioCodec);
  }

  const resolvedVideoBitrate = normalizeBitrate(settings?.videoBitrate) || normalizeBitrate(videoBitrate);
  if (resolvedVideoBitrate) {
    command = command.videoBitrate(resolvedVideoBitrate);
  }

  const resolvedAudioBitrate = normalizeBitrate(settings?.audioBitrate) ||
    normalizeBitrate(audioBitrate) ||
    normalizeBitrate(bitrate);
  if (resolvedAudioBitrate) {
    command = command.audioBitrate(resolvedAudioBitrate);
  }

  const resolvedSampleRate =
    settings?.sampleRate && settings.sampleRate !== 'auto'
      ? Number(settings.sampleRate)
      : sampleRate && sampleRate !== 'auto'
        ? Number(sampleRate)
        : undefined;
  if (resolvedSampleRate) {
    command = command.audioFrequency(resolvedSampleRate);
  }

  const resolvedFrameRate =
    settings?.frameRate && settings.frameRate !== 'auto'
      ? Number(settings.frameRate)
      : frameRate && frameRate !== 'auto'
        ? Number(frameRate)
        : fps && fps !== 'auto'
          ? Number(fps)
          : undefined;
  if (resolvedFrameRate) {
    command = command.fps(resolvedFrameRate);
  }

  command
    .toFormat(resolvedFormat)
    .on('progress', (progress) => {
      const percent = Number(progress.percent || 0);
      task.percent = Math.max(0, Math.min(100, Math.round(percent)));
    })
    .on('end', () => {
      finalizeTaskSuccess(task, outputFilename);
    })
    .on('error', (error) => {
      finalizeTaskError(task, error);
    })
    .save(outputFilePath);

  res.json({ success: true, id });
});

app.post('/api/add-watermark', async (req: Request, res: Response) => {
  const { id, inputPath, outputPath, watermarks } = req.body || {};
  if (!id || !Array.isArray(watermarks) || watermarks.length === 0) {
    return res.status(400).json({ error: 'Missing watermark data' });
  }

  const inputEntry = locateInputFile(inputPath, id);
  if (!inputEntry) {
    return res.status(404).json({ error: 'Input file not found' });
  }

  const task = tasks.get(id) || { status: 'pending', percent: 0 };
  tasks.set(id, task);

  const outputFilename = path.basename(String(outputPath || `${id}_watermark.mp4`));
  const outputFilePath = path.join(outputDir, outputFilename);
  if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

  task.status = 'converting';
  task.percent = 0;
  task.error = undefined;

  let command = ffmpeg(path.join(inputEntry.dir, inputEntry.file));
  const filters: string[] = [];
  let inputIndex = 1;

  for (const wm of watermarks) {
    if (wm.type === 'image' && wm.path) {
      const wmEntry = locateInputFile(wm.path, id);
      if (wmEntry) {
        command = command.input(path.join(wmEntry.dir, wmEntry.file));
        const x = Number(wm.actualX ?? wm.x ?? 10);
        const y = Number(wm.actualY ?? wm.y ?? 10);
        filters.push(`[0:v][${inputIndex}:v]overlay=${x}:${y}`);
        inputIndex += 1;
      }
    } else if (wm.type === 'text' && wm.text) {
      const x = Number(wm.actualX ?? wm.x ?? 10);
      const y = Number(wm.actualY ?? wm.y ?? 10);
      const fontSize = Number(wm.actualFontSize ?? wm.fontSize ?? 24);
      const safeText = escapeDrawtextValue(String(wm.text));
      const fontfilePart = drawtextFontFile ? `:fontfile='${escapeDrawtextValue(drawtextFontFile)}'` : '';
      filters.push(
        `drawtext=fontcolor=white:fontsize=${fontSize}:x=${x}:y=${y}${fontfilePart}:text='${safeText}'`,
      );
    }
  }

  if (filters.length > 0) {
    command = command.videoFilters(filters);
  }

  command
    .on('progress', (progress) => {
      task.percent = Math.max(0, Math.min(100, Math.round(Number(progress.percent || 0))));
    })
    .on('end', () => finalizeTaskSuccess(task, outputFilename))
    .on('error', (error) => finalizeTaskError(task, error))
    .save(outputFilePath);

  res.json({ success: true, id });
});

app.post('/api/remove-watermark', async (req: Request, res: Response) => {
  const { id, inputPath, outputPath, areas, mode, fillColor } = req.body || {};
  if (!id || !Array.isArray(areas) || areas.length === 0) {
    return res.status(400).json({ error: 'Missing remove-watermark data' });
  }

  const inputEntry = locateInputFile(inputPath, id);
  if (!inputEntry) {
    return res.status(404).json({ error: 'Input file not found' });
  }

  const task = tasks.get(id) || { status: 'pending', percent: 0 };
  tasks.set(id, task);

  const outputFilename = path.basename(String(outputPath || `${id}_clean.mp4`));
  const outputFilePath = path.join(outputDir, outputFilename);
  if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

  task.status = 'converting';
  task.percent = 0;
  task.error = undefined;

  const filters = areas.map((area: any) => {
    const x = Number(area.x || 0);
    const y = Number(area.y || 0);
    const width = Number(area.width || 10);
    const height = Number(area.height || 10);
    if (mode === 'fill') {
      return `drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=${fillColor || 'black'}:t=fill`;
    }
    return `boxblur=10:1`;
  });

  ffmpeg(path.join(inputEntry.dir, inputEntry.file))
    .videoFilters(filters)
    .on('progress', (progress) => {
      task.percent = Math.max(0, Math.min(100, Math.round(Number(progress.percent || 0))));
    })
    .on('end', () => finalizeTaskSuccess(task, outputFilename))
    .on('error', (error) => finalizeTaskError(task, error))
    .save(outputFilePath);

  res.json({ success: true, id });
});

app.get('/api/progress/:id', (req: Request, res: Response) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

app.get('/api/progress', (_req: Request, res: Response) => {
  const progressData: Record<string, number> = {};
  tasks.forEach((task, id) => {
    progressData[id] = task.percent;
  });
  res.json(progressData);
});

if (fs.existsSync(distWebDir)) {
  app.use(express.static(distWebDir));

  app.get(/^(?!\/api|\/download).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(distWebDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
