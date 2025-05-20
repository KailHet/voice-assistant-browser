const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const psList = require('ps-list');
const { exec } = require('child_process');
const find = require('find-process')
require('dotenv').config()
const open = require('open')

const app = express();

// setInterval(async () => {
//   const files = await fs.readdir(`/home/kailhet/bots/file-server/public/files`, {
//     withFileTypes: true
//   })

//   console.log(files)
// }, 60000);

app.use(express.static(path.join(__dirname, 'public')));
console.log('---')

app.get('/data', async (req, res) => {
  const config = await fs.readFile('./data.json', 'utf-8')
  res.status(200).json(config)
})

app.get('/talkToAI/:phrase', async (req,res) => {
  console.log('1')
  const response = await fetch("https://api.mistral.ai/v1/agents/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
        messages: [
            {
                role: "user",
                content: "\n\nprompt: " + req.params.phrase,
            }
        ],
        agent_id: process.env.MISTRAL_AGENT_ID,
        // stream: true
    })
  })

  if (response.status !== 200) return console.error(response);
  const data = await response.json();

  console.log(data)
  res.status(200).json(data)
})

app.get('/openApp/:app', async (req, res) => {
  const config = JSON.parse(await fs.readFile('./data.json', 'utf-8'))
  console.log(req.params)

  let appName

  for (let phrase of config.phrases) {
    if (phrase.secondTrigger.includes(req.params.app)) appName = phrase.data
  }

  openApp(appName).catch(console.error);

  // find('name', new RegExp(req.params.app, 'gi'))
  // .then((list) => {
  //   if (list[0]) {
  //     console.log(list)
  //   }
  // })
})

app.get('/openUrl/:url', async (req, res) => {

  open(req.params.url)

})

async function openApp(appName) {
  // const appName = process.argv[2];
  if (!appName) return console.error('Имя приложенеия не указано');

  // Загрузка конфигурации
  let config;
  try {
    config = require('./data.json');
  } catch (e) {return console.error('Ошибка загрузки data.json');}

  const exePath = config.apps[appName];
  if (!exePath) return console.error(`Приложение "${appName}" не найдено в data.json`);

  const processName = path.basename(exePath); // Например, 'Telegram.exe'
  // const processNameWithoutExe = path.basename(exePath, '.exe'); // 'Telegram'

  // Проверка, запущен ли процесс
  // find('name', appName)
  // .then(async (processes) => {
  //   console.log('1')
  //   if (processes[0]) {
  //       console.log(`Активация окна ${processNameWithoutExe}...`);
  //       await activateWindow(processNameWithoutExe);
  //   } else {
  console.log(`Запуск приложения ${processName}...`);
  exec(`"${exePath}"`, (error) => {
    if (error) {
      console.error(`Ошибка запуска: ${error.message}`);
      return;
    }
    console.log('Приложение успешно запущено!');
  });
  //   }
  // })
  // const processes = await psList();

}

async function activateWindow(processName) {
  const scriptContent = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
$process = Get-Process | Where-Object { $_.ProcessName -eq "${processName}" -and $_.MainWindowHandle -ne 0 }
if ($process) {
  [Win32]::ShowWindow($process.MainWindowHandle, 3) # SW_MAXIMIZE
  [Win32]::SetForegroundWindow($process.MainWindowHandle)
}
  `;

  const tempFile = path.join(__dirname, 'temp.ps1');
  fs.writeFileSync(tempFile, scriptContent);

  return new Promise((resolve, reject) => {
    exec(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      if (error) {
        reject(`Ошибка: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      resolve();
    });
  });
}

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});