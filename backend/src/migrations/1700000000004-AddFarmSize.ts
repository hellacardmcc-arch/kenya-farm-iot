import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFarmSize1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add farm_size column
    await queryRunner.addColumn(
      "farmers",
      new TableColumn({
        name: "farm_size",
        type: "decimal",
        precision: 5,
        scale: 2,
        isNullable: true,
      })
    );

    // Update phone column length to 10
    await queryRunner.query(`
      ALTER TABLE farmers 
      ALTER COLUMN phone TYPE VARCHAR(10)
    `);

    // Make password_hash nullable
    await queryRunner.query(`
      ALTER TABLE farmers 
      ALTER COLUMN password_hash DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove farm_size column
    await queryRunner.dropColumn("farmers", "farm_size");

    // Revert phone column length to 20
    await queryRunner.query(`
      ALTER TABLE farmers 
      ALTER COLUMN phone TYPE VARCHAR(20)
    `);

    // Revert password_hash to NOT NULL (if needed)
    // Note: This will fail if there are NULL values
    // await queryRunner.query(`
    //   ALTER TABLE farmers 
    //   ALTER COLUMN password_hash SET NOT NULL
    // `);
  }
}
