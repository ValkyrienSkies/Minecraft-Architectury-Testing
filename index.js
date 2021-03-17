const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const { spawn } = require('child_process');
const process = require('process');

// Run the task
async function run() {
  console.log('[ACTION] Running gradle build test.');

  await runBuild(() => {
    console.log('[ACTION] Running server test!');

    let dir = './run/'

    if (!fs.existsSync(dir))
      fs.mkdirSync(dir);

    fs.writeFile( './run/eula.txt', 'eula=true', { flag: 'wx' }, err => {
      if(err)
        core.setFailed(err.message);

      runServer(() => {
          console.log('[ACTION] Fabric server test has passed!')
          runServer(() => {
              console.log('[ACTION] Forge server test has passed!')
              console.log('[ACTION] All tests have passed!')
          }, 'forge');
      }, 'fabric');
    });
  })
}

// Test building the mod
async function runBuild(callback) {
  let build;


  if(process.platform === 'win32')
    build = await spawn('cmd', ['/c', 'gradlew', 'build', '--refresh-dependencies'])
  else
    build = await spawn('./gradlew', ['build', '--refresh-dependencies'])


  build.stdout.on('data', (data) => process.stdout.write(`${data}`));

  build.stderr.on('data', (data) => process.stderr.write(`${data}`));

  build.on('error', (err) => process.stderr.write(err))

  // eslint-disable-next-line no-unused-vars
  build.on('close', (code) => callback())
}

// Test running the server
async function runServer(callback, serverType) {
  let server;

  if(process.platform === 'win32')
    server = await spawn('gradlew', [serverType.concat(':runServer'), '--args=“nogui”'], { shell: true});
  else
    server = await spawn('./gradlew', [serverType.concat(':runServer'), '--args=“nogui”']);

  server.stdout.on('data', (data) => {
    if (data.includes('For help, type')) {
      console.log('[ACTION] Server test complete! Exiting process.')

      if(process.platform === 'win32')
        spawn("taskkill", ["/pid", server.pid, '/f', '/t']);
      else
        server.kill();
    }

    process.stdout.write(`${data}`)
  });

  server.stderr.on('data', (data) => process.stderr.write(`${data}`));

  server.on('error', (err) => process.stderr.write(err))

  // eslint-disable-next-line no-unused-vars
  server.on('close', (code) => callback())
}

run()
