/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.alterColumn("users", "created_at", {
    default: pgm.func("timezone('utc', now())"),
  });
  pgm.alterColumn("users", "updated_at", {
    default: pgm.func("timezone('utc', now())"),
  });
  // Altering the password column to have a length of 60 characters
  // This is a common length for bcrypt hashed passwords
  pgm.alterColumn("users", "password", {
    type: "VARCHAR(60)",
    notNull: true,
  });
};
