// src/migrations/run-migrations.ts
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../db/postgres'; // your Sequelize instance
import path from 'path';

export const runMigrations = async () => {
    const umzug = new Umzug({
        migrations: {
            glob: path.join(process.cwd(), 'src', 'migrations', '*.migration.*'),
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: console,
    });

    await umzug.up();
};

if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('Migrations finished');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Migrations failed', err);
            process.exit(1);
        });
}
