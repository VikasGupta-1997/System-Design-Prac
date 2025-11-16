import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../connection";

interface UserAttributes {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  bio: string;
}

interface UserCreationAttributes extends Optional<UserAttributes, "id"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> 
  implements UserAttributes {
  declare id: string;
  declare username: string;
  declare email: string;
  declare password_hash: string;
  declare role: string;
  declare bio: string;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "moderator"),
      allowNull: false,
      defaultValue: "user",
    },
    bio: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "Hello User"
    },
  },
  {
    tableName: "users",
    sequelize,
  }
);

export default User;
