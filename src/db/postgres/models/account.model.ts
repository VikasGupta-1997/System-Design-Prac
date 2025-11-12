// models/Account.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../connection";
import { User } from "./auth.model";

interface AccountAttributes {
  id: string;
  userId: string;
  provider: "google" | "github";
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AccountCreationAttributes
  extends Optional<AccountAttributes, "id" | "accessToken" | "refreshToken"> {}

export class Account extends Model<AccountAttributes, AccountCreationAttributes>
  implements AccountAttributes {
  declare id: string;
  declare userId: string;
  declare provider: "google" | "github";
  declare providerAccountId: string;
  declare accessToken: string | null;
  declare refreshToken: string | null;
}

Account.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.ENUM("google", "github"), allowNull: false },
    providerAccountId: { type: DataTypes.STRING(191), allowNull: false },
    accessToken: { type: DataTypes.TEXT, allowNull: true },
    refreshToken: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "accounts",
    sequelize,
    indexes: [
      { unique: true, fields: ["provider", "providerAccountId"] },
      { fields: ["userId"] },
    ],
  }
);

// Associations
User.hasMany(Account, { foreignKey: "userId", as: "accounts", onDelete: "CASCADE" });
Account.belongsTo(User, { foreignKey: "userId", as: "user" });
