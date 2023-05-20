import { Model } from 'sequelize'


export function constructor(sequelize, DataTypes) {
    class Draw extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }


    Draw.init({
        cid: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        rules: DataTypes.STRING,
        winnerSelection: DataTypes.STRING,
        participants: DataTypes.ARRAY(DataTypes.STRING),
        scheduledAt: DataTypes.DATE,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'Draw',
    });


    return Draw;
}