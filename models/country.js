import { DataTypes } from "sequelize";

export default function (sequelize) {
  return sequelize.define(
    "Country",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, 
        set(value) {
          this.setDataValue("name", value.toLowerCase());
        },
      },
      capital: { type: DataTypes.STRING },
      region: { type: DataTypes.STRING },
      population: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      currency_code: { type: DataTypes.STRING },
      exchange_rate: { type: DataTypes.DOUBLE },
      estimated_gdp: { type: DataTypes.DOUBLE },
      flag_url: { type: DataTypes.STRING },
      last_refreshed_at: { type: DataTypes.DATE },
    },
    {
      tableName: "countries",
      timestamps: true,
    }
  );
}
