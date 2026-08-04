const { sequelize } = require('./config/db');

async function killLocks() {
  try {
    console.log('Connecting to MySQL to find locked processes...');
    const [results] = await sequelize.query('SHOW FULL PROCESSLIST');
    let killed = 0;

    for (let row of results) {
      // Find queries that are stuck for more than 15 seconds
      if (row.Command === 'Query' || row.Command === 'Sleep') {
        if (row.Time > 15 && row.Id !== sequelize.config.port) {
          console.log(`Killing stuck process ID: ${row.Id} (Running for ${row.Time}s)`);
          await sequelize.query(`KILL ${row.Id}`).catch(e => console.error(e.message));
          killed++;
        }
      }
    }

    if (killed === 0) {
      console.log('No stuck locks found. Everything should be working now!');
    } else {
      console.log(`Successfully killed ${killed} frozen database locks!`);
    }

    process.exit(0);
  } catch (e) {
    console.error('Error connecting to MySQL:', e.message);
    process.exit(1);
  }
}

killLocks();
