const { sq } = require("../config/db");
const { DataTypes } = require("sequelize");

const Draw = sq.define("draw", {
    cid: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    rules: DataTypes.STRING,
    winnerSelection: DataTypes.STRING,
    participants: DataTypes.ARRAY(DataTypes.STRING),
    createdAt: DataTypes.DATE,
    scheduledAt: DataTypes.DATE,
});

Draw.sync().then(() => {
    console.log("Draw Model synced");
});

module.exports = Draw;