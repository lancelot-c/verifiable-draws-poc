'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Asset.init({
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
    },
    price: DataTypes.JSON,
    max_supply: DataTypes.INTEGER,
    total_supply: DataTypes.INTEGER,
    max_mint_per_tx: DataTypes.INTEGER,
    type: DataTypes.STRING,
    category: DataTypes.STRING,
    biome: DataTypes.STRING,
    thumbnail_url: DataTypes.STRING,
    available: DataTypes.BOOLEAN,
    metadata: DataTypes.JSON,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Asset',
  });
  return Asset;
};