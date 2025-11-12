'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the columns
    await queryInterface.removeColumn('users', 'test');
    await queryInterface.removeColumn('users', 'test2');
    await queryInterface.removeColumn('users', 'test3');
    await queryInterface.removeColumn('users', 'test4');
    await queryInterface.removeColumn('users', 'test5');
    await queryInterface.removeColumn('users', 'bio');
  },

  async down(queryInterface, Sequelize) {
    // Restore them if needed
    await queryInterface.addColumn('users', 'test', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'test2', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'test3', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'test4', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'test5', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'bio', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
