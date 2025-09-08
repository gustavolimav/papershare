import { exec } from 'node:child_process';

function checkPostgres(): void {
  exec('docker exec linkpaper-dev-db pg_isready --host localhost', handleReturn);

  function handleReturn(error: any, stdout: string): void {
    if (stdout.search('accepting connections') === -1) {
      process.stdout.write('.');
      checkPostgres();
      return;
    }

    console.log('\n🟢 Postgres está pronto e aceitando conexões!\n');
  }
}

process.stdout.write('\n\n🔴 Aguardando Postgres aceitar conexões');
checkPostgres();
