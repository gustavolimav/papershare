import type { QueryResult, QueryResultRow } from 'pg';
import type { NextApiRequest, NextApiResponse } from 'next';

// Database Models
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Input Types
export interface UserCreateInput {
  username: string;
  email: string;
  password: string;
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string;
}

export interface AuthenticationInput {
  email: string;
  password: string;
}

// Database Query Types
export interface DatabaseQuery {
  text: string;
  values?: any[];
}

export interface DatabaseResult<T extends QueryResultRow = any> extends QueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  action?: string;
}

export interface StatusResponse {
  updated_at: string;
  dependencies: {
    database: {
      version: string;
      max_connections: number;
      opened_connections: number;
    };
  };
}

// Error Types
export interface ErrorResponse {
  name: string;
  message: string;
  action: string;
  status: number;
}

export interface ErrorConstructorOptions {
  cause?: Error;
  message?: string;
  action?: string;
  statusCode?: number;
}

// Next.js API Types
export interface AuthenticatedNextApiRequest extends NextApiRequest {
  user?: User;
  session?: Session;
}

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => void | Promise<void>;

// Migration Types
export interface Migration {
  id: number;
  name: string;
  run_on: Date;
}

export interface RunMigration {
  name: string;
  filename: string;
}

// Model Interface Types
export interface UserModel {
  create(userInput: UserCreateInput): Promise<UserPublic>;
  findOneByUsername(username: string): Promise<User>;
  findOneByEmail(email: string): Promise<User>;
  updateByUsername(username: string, userInput: UserUpdateInput): Promise<UserPublic>;
}

export interface PasswordModel {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface SessionModel {
  create(userId: string): Promise<Session>;
  EXPIRATION_IN_MILLISECONDS: number;
}

export interface AuthenticationModel {
  getAuthentication(email: string, password: string): Promise<User>;
}

export interface MigratorModel {
  listPendingMigrations(): Promise<RunMigration[]>;
  runPendingMigrations(): Promise<RunMigration[]>;
}

export interface DatabaseModel {
  query<T extends QueryResultRow = any>(query: string | DatabaseQuery): Promise<DatabaseResult<T>>;
  getNewClient(): Promise<any>;
}

// Environment Variables
export interface ProcessEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  POSTGRES_HOST: string;
  POSTGRES_PORT: string;
  POSTGRES_USER: string;
  POSTGRES_DB: string;
  POSTGRES_PASSWORD: string;
  DATABASE_URL: string;
  PEPPER: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ProcessEnv {}
  }
}
