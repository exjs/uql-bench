"use strict";

var xql = require("xql");
var squel = require("squel");

var knex = require("knex")({
  // We have to use some DB, this seems easiest.
  client: "sqlite3",
  connection: {
    filename: "./xql-bench-tmp.sqlite"
  }
});

// ============================================================================
// [Options]
// ============================================================================

var Options = {
  quantity: 100000 // Number of calls.
};

var IgnoredKeys = {
  moduleInfo: true
};

// ============================================================================
// [xql.js]
// ============================================================================

var xqlpg = xql.createContext({ dialect: "pgsql" });

var xqlBench = (function() {
  var SELECT = xql.SELECT;
  var UPDATE = xql.UPDATE;
  var INSERT = xql.INSERT;
  var DELETE = xql.DELETE;

  var COL = xql.COL;
  var OP = xql.OP;

  return {
    moduleInfo: function() {
      return "xql.js " + xql.misc.VERSION;
    },

    SELECT_0: function() {
      return SELECT(["a", "b", "c"])
        .FROM("x")
        .compileQuery(xqlpg);
    },

    SELECT_1: function() {
      return SELECT(["a", "b", "c"])
        .FROM("x")
        .WHERE("enabled", "=", true)
        .OFFSET(100)
        .LIMIT(50)
        .compileQuery(xqlpg);
    },

    SELECT_2: function() {
      return SELECT(["a", "b", "c"])
        .FROM("x")
        .WHERE("enabled", "=", false)
        .WHERE("pending", "=", false)
        .WHERE("blocked", "=", false)
        .compileQuery(xqlpg);
    },

    SELECT_3: function() {
      return SELECT(["x.a", "x.b", "y.c"])
        .FROM("x")
        .INNER_JOIN("y", OP(COL("x.uid"), "=", COL("y.uid")))
        .compileQuery(xqlpg);
    },

    INSERT_0: function() {
      return INSERT("x")
        .VALUES({ a: 0, b: false, c: "'someText\"" })
        .compileQuery(xqlpg);
    },

    UPDATE_0: function() {
      return UPDATE("x")
        .VALUES({
          a: 1,
          b: 2,
          c: "'\"?someStringToBeEscaped'"
        })
        .WHERE("uid", "=", 1)
        .compileQuery(xqlpg);
    },

    DELETE_0: function() {
      return DELETE("x")
        .WHERE("uid", ">=", 1)
        .compileQuery(xqlpg);
    }
  };
})();

// ============================================================================
// [Knex]
// ============================================================================

var KnexBench = (function() {
  return {
    moduleInfo: function() {
      return "Knex " + knex.VERSION;
    },

    SELECT_0: function() {
      return knex("x")
       .select(["a", "b", "c"])
       .toString();
    },

    SELECT_1: function() {
      return knex("x")
       .select(["a", "b", "c"])
       .where("enabled", "=", true)
       .offset(100)
       .limit(50)
       .toString();
    },

    SELECT_2: function() {
      return knex("x")
       .select(["a", "b", "c"])
       .where("enabled", "=", false)
       .where("pending", "=", false)
       .where("blocked", "=", false)
       .toString();
    },

    SELECT_3: function() {
      return knex("x")
       .select(["x.a", "x.b", "y.c"])
       .innerJoin("y", "x.uid", "y.uid")
       .toString();
    },

    INSERT_0: function() {
      return knex("x")
        .insert({ a: 0, b: false, c: "'someText\"" })
        .toString();
    },

    UPDATE_0: function() {
      return knex("x")
        .update({
          a: 1,
          b: 2,
          c: "'\"?someStringToBeEscaped'"
        })
        .where("uid", "=", 1)
        .toString();
    },

    DELETE_0: function() {
      return knex("x")
        .del()
        .where("uid", ">=", 1)
        .toString();
    }
  };
})();

// ============================================================================
// [Squel]
// ============================================================================

var SquelBench = (function() {
  return {
    moduleInfo: function() {
      return "Squel " + squel.VERSION;
    },

    SELECT_0: function() {
      return squel.select()
        .from("x")
        .field("a").field("b").field("c")
        .toString();
    },

    SELECT_1: function() {
      return squel.select()
        .from("x")
        .field("a").field("b").field("c")
        .where("enabled = TRUE")
        .offset(100)
        .limit(50)
        .toString();
    },

    SELECT_2: function() {
      return squel.select()
        .from("x")
        .field("a").field("b").field("c")
        .where("enabled = FALSE")
        .where("pending = FALSE")
        .where("blocked = FALSE")
        .toString();
    },

    SELECT_3: function() {
      return squel.select()
        .from("x")
        .field("x.uid").field("x.name").field("r.granted")
        .left_join("y", "x.uid = y.uid")
        .toString();
    },

    INSERT_0: function() {
      return squel.insert()
        .into("x")
        .setFields({ a: 0, b: false, c: "'someText\"" })
        .toString();
    },

    UPDATE_0: function() {
      return squel.update()
        .table("x")
        .set("a", 1)
        .set("b", 2)
        .set("c", "'\"?someStringToBeEscaped'")
        .where("uid = 1")
        .toString();
    },

    DELETE_0: function() {
      return squel.delete()
        .from("x")
        .where("uid >= 1")
        .toString();
    }
  };
})();

// ============================================================================
// [Utils]
// ============================================================================

var Utils = {
  padLeft: function(s, n) {
    while (s.length < n)
      s = " " + s;
    return s;
  },

  test: function(fn, name) {
    var result = "";
    var query = fn();

    var quantity = Options.quantity;
    var timeStart = +new Date();

    for (var i = 0; i < quantity; i++) {
      result = result.substring(0, 0) + fn();
    }

    var timeEnd = +new Date();
    var timeStr = Utils.padLeft(((timeEnd - timeStart) / 1000).toFixed(3), 6);

    console.log(name + ":" + timeStr + " [s]: " + query);
  }
};

// ============================================================================
// [Main]
// ============================================================================

function main() {
  var modules = [xqlBench, KnexBench, SquelBench];

  modules.forEach(function(module) {
    console.log(module.moduleInfo());
    for (var name in module) {
      if (IgnoredKeys[name] === true)
        continue;
      Utils.test(module[name], name);
    }
    console.log("");
  });
}

main();