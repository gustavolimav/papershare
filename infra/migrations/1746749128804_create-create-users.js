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
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    // for reference github uses 39 characters
    username: {
      type: "VARCHAR(30)",
      notNull: true,
      unique: true,
    },
    // why 72 characters? https://security.stackexchange.com/q/39849
    password: {
      type: "VARCHAR(72)",
      notNull: true,
    },
    // why 254 characters? https://stackoverflow.com/a/1199238
    email: {
      type: "VARCHAR(254)",
      notNull: true,
      unique: true,
    },
    // why timestamptz instead of timestamp? https://justatheory.com/2012/04/postgres-use-timestamptz/
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
};
