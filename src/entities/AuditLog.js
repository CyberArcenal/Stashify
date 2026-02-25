// AuditLog.js placeholder
const { EntitySchema } = require("typeorm");

const AuditLog = new EntitySchema({
  name: "AuditLog",
  tableName: "audit_logs",
  columns: {
    id: {
      primary: true,
      type: "int",
      generated: true,
    },
    action: {
      type: "varchar",
    },
    entity: {
      type: "varchar",
    },
    entityId: {
      type: "int",
      nullable: true,
    },
    timestamp: {
      type: "datetime",
      createDate: true,
    },
    description: {
      type: "varchar",
      nullable: true,
    },
    newData: {
      type: "varchar",
      nullable: true,
    },
    previousData: {
      type: "varchar",
      nullable: true,
    },
  },
});

module.exports = { AuditLog };
