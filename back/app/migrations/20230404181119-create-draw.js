'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Draws', {
      cid: {
        allowNull: false,
        unique: true,
        primaryKey: true,
        autoIncrement: false,
        type: Sequelize.STRING
      },
      rules: {
        allowNull: false,
        type: Sequelize.STRING
      },
      winnerSelection: {
        allowNull: false,
        type: Sequelize.STRING
      },
      participants: {
        allowNull: false,
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      scheduledAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Draws');
  }
};