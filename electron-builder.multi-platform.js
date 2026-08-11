const pkg = require('./package.json');

const baseBuild = pkg.build || {};
const baseExtraResources = Array.isArray(baseBuild.extraResources) ? baseBuild.extraResources : [];
const baseFiles = Array.isArray(baseBuild.files) ? baseBuild.files : [];

const nonWindowsExtraResources = baseExtraResources.filter((resource) => resource.to !== 'updater.exe');
const multiPlatformFiles = [
  ...baseFiles,
  'build/icon.png',
  'build/icon.icns',
  'build/icons/**/*',
  '!node_modules/@ffmpeg-installer/win32-*/**/*',
  '!node_modules/@ffprobe-installer/win32-*/**/*',
  '!node_modules/@ffmpeg-installer/linux-arm*/**/*',
  '!node_modules/@ffprobe-installer/linux-arm*/**/*',
  '!node_modules/@ffmpeg-installer/linux-ia32/**/*',
  '!node_modules/@ffprobe-installer/linux-ia32/**/*'
];

module.exports = {
  ...baseBuild,
  productName: '视频转换助手',
  extraResources: [
    ...nonWindowsExtraResources,
    {
      from: 'build/icon.png',
      to: 'app-icon.png'
    }
  ],
  files: multiPlatformFiles,
  directories: {
    ...(baseBuild.directories || {}),
    output: 'release_build_multi_platform'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'tar.gz',
        arch: ['x64']
      }
    ],
    category: 'AudioVideo',
    icon: 'build/icons',
    artifactName: '${productName}-${version}-linux-${arch}.${ext}'
  },
  mac: {
    target: [
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    category: 'public.app-category.video',
    icon: 'build/icon.icns',
    artifactName: '${productName}-${version}-mac-${arch}.${ext}'
  }
};
