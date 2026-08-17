using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace KunqiuVideoConverterUpdater
{
    internal static class Program
    {
        private static readonly string LogPath = Path.Combine(Path.GetTempPath(), "kunqiu-video-converter-updater.log");

        private static int Main(string[] args)
        {
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

                Dictionary<string, string> options = ParseArgs(args);
                string url = GetRequired(options, "url");
                string hash = GetOptional(options, "hash");
                string pidText = GetOptional(options, "pid");

                Uri updateUri;
                if (!Uri.TryCreate(url, UriKind.Absolute, out updateUri))
                {
                    throw new ArgumentException("Invalid update URL.");
                }

                string targetPath = CreateDownloadPath(updateUri);
                Log("Downloading update from " + url);
                DownloadFile(updateUri, targetPath);

                if (!string.IsNullOrWhiteSpace(hash))
                {
                    VerifySha256(targetPath, hash);
                }

                WaitForAppExit(pidText);
                LaunchDownloadedPackage(targetPath);

                Log("Updater completed.");
                return 0;
            }
            catch (Exception ex)
            {
                Log("Updater failed: " + ex);
                return 1;
            }
        }

        private static Dictionary<string, string> ParseArgs(string[] args)
        {
            Dictionary<string, string> parsed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < args.Length; i++)
            {
                string key = args[i];
                if (!key.StartsWith("--", StringComparison.Ordinal))
                {
                    continue;
                }

                string name = key.Substring(2);
                string value = i + 1 < args.Length && !args[i + 1].StartsWith("--", StringComparison.Ordinal)
                    ? args[++i]
                    : string.Empty;
                parsed[name] = value;
            }

            return parsed;
        }

        private static string GetRequired(Dictionary<string, string> options, string name)
        {
            string value = GetOptional(options, name);
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Missing required argument --" + name + ".");
            }

            return value;
        }

        private static string GetOptional(Dictionary<string, string> options, string name)
        {
            string value;
            return options.TryGetValue(name, out value) ? value : string.Empty;
        }

        private static string CreateDownloadPath(Uri updateUri)
        {
            string fileName = Path.GetFileName(updateUri.LocalPath);
            if (string.IsNullOrWhiteSpace(fileName))
            {
                fileName = "video-format-helper-update.exe";
            }

            string safeFileName = Regex.Replace(fileName, "[^a-zA-Z0-9._\\-\\u4e00-\\u9fa5]", "_");
            string updateDir = Path.Combine(Path.GetTempPath(), "KunqiuVideoConverterUpdate");
            Directory.CreateDirectory(updateDir);
            return Path.Combine(updateDir, DateTime.Now.ToString("yyyyMMddHHmmss") + "_" + safeFileName);
        }

        private static void DownloadFile(Uri updateUri, string targetPath)
        {
            using (WebClient client = new WebClient())
            {
                client.Headers.Add(HttpRequestHeader.UserAgent, "KunqiuVideoConverterUpdater/1.0");
                client.DownloadFile(updateUri, targetPath);
            }
        }

        private static void VerifySha256(string filePath, string expectedHash)
        {
            string normalizedExpected = NormalizeHash(expectedHash);
            if (normalizedExpected.Length != 64)
            {
                Log("Skipping hash verification because expected hash is not a SHA-256 value.");
                return;
            }

            string actualHash;
            using (FileStream stream = File.OpenRead(filePath))
            using (SHA256 sha = SHA256.Create())
            {
                actualHash = BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
            }

            if (!string.Equals(actualHash, normalizedExpected, StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(filePath);
                throw new InvalidOperationException("Downloaded update hash mismatch.");
            }
        }

        private static string NormalizeHash(string hash)
        {
            return hash
                .Replace("sha256:", string.Empty)
                .Replace("SHA256:", string.Empty)
                .Replace("-", string.Empty)
                .Replace(" ", string.Empty)
                .Trim()
                .ToLowerInvariant();
        }

        private static void WaitForAppExit(string pidText)
        {
            int pid;
            if (!int.TryParse(pidText, out pid) || pid <= 0)
            {
                return;
            }

            try
            {
                Process process = Process.GetProcessById(pid);
                process.WaitForExit(90000);
            }
            catch (ArgumentException)
            {
                // The app has already exited.
            }
        }

        private static void LaunchDownloadedPackage(string targetPath)
        {
            if (!File.Exists(targetPath))
            {
                throw new FileNotFoundException("Downloaded update package does not exist.", targetPath);
            }

            ProcessStartInfo startInfo = new ProcessStartInfo(targetPath)
            {
                UseShellExecute = true,
                WorkingDirectory = Path.GetDirectoryName(targetPath)
            };

            Process.Start(startInfo);
        }

        private static void Log(string message)
        {
            try
            {
                File.AppendAllText(
                    LogPath,
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " " + message + Environment.NewLine
                );
            }
            catch
            {
                // Logging should never block update execution.
            }
        }
    }
}
