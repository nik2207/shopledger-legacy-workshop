var assert = require('node:assert/strict');
var test = require('node:test');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('inventory permits sale of the last available sellable unit', function () {
  var products = [{ id: 1, name: 'A2 Gir Cow Ghee 500ml', sku: 'DRY-001', stock: 1, reserved: 0 }];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('inventory calculates exact sellable stock after reservations', function () {
  var products = [{ id: 2, name: 'Byadgi Chilli Powder', sku: 'SPC-001', stock: 4, reserved: 3 }];

  assert.equal(inventory.getSellableStock(products[0]), 1);
  assert.deepEqual(inventory.check(products, [{ id: 2, qty: 1 }]), { ok: true });
  assert.equal(inventory.check(products, [{ id: 2, qty: 2 }]).ok, false);
});

test('cancelling a pending order restores its deducted stock once', function () {
  var db = {
    products: [
      { id: 6, name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 },
      { id: 4, name: 'Sunflower Oil 1L', stock: 22, reserved: 4 }
    ],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      items: [{ id: 6, qty: 2 }, { id: 4, qty: 2 }],
      total: 200
    }]
  };

  var result = orders.cancel(db, 1007, 'Customer cancelled');
  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(db.products[0].stock, 3);
  assert.equal(db.products[1].stock, 24);
  assert.equal(db.products[1].reserved, 4);

  var repeated = orders.cancel(db, 1007, 'Customer cancelled again');
  assert.equal(repeated.ok, false);
  assert.equal(db.products[0].stock, 3);
  assert.equal(db.products[1].stock, 24);
});
