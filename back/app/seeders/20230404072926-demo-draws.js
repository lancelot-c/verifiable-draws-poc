'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('People', [{
         *   name: 'John Doe',
         *   isBetaMember: false
         * }], {});
        */
       const demoDraws = [
		{
			"cid": "bafybeidi32pvwvfwjtzrtzuhiqqapqcdhy3xjwfrtldaxiaze34gdbuwuq",
			"rules": "Blip",
			"winnerSelection": "Bloup",
			"participants": ["lancelot", "guillaume", "louis"],
            "scheduledAt": new Date(),
            "createdAt": new Date(),
            "updatedAt": new Date()
		}
	];

        await queryInterface.bulkInsert('Draws', demoDraws, {}, {});
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete('Draws', null, {});
    }
};
