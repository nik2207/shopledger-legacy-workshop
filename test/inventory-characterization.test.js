var assert = require('node:assert/strict');
var test = require('node:test');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('inventory permits a sale equal to all sellable stock', function () {
  var products = [{ id: 1, name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 }];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('inventory permits a sale equal to stock remaining after reservations', function () {
  var products = [{ id: 2, name: 'Byadgi Chilli Powder', stock: 4, reserved: 3 }];

  assert.equal(inventory.getSellableStock(products[0]), 1);
  assert.deepEqual(inventory.check(products, [{ id: 2, qty: 1 }]), { ok: true });
});

test('inventory rejects a quantity greater than sellable stock', function () {
  var products = [{ id: 3, name: 'Test Flour', stock: 4, reserved: 3 }];

  assert.deepEqual(inventory.check(products, [{ id: 3, qty: 2 }]), {
    ok: false,
    msg: 'Test Flour is out of stock (1 sellable available)'
  });
});

test('cancelling a pending order marks it cancelled and restores physical stock', function () {
  var db = {
    products: [{ id: 6, stock: 1, reserved: 0 }],
    orders: [{ id: 1007, status: 'pending', paymentMode: 'cash', items: [{ id: 6, qty: 2 }], total: 1000 }]
  };

  var result = orders.cancel(db, 1007, 'Test cancellation');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(db.products[0].stock, 3);
  assert.equal(db.products[0].reserved, 0);
});

test('orders reject cancellation of an already-cancelled order without changing inventory', function () {
  var db = {
    products: [{ id: 6, stock: 1, reserved: 0 }],
    orders: [{ id: 1007, status: 'cancelled', paymentMode: 'cash', items: [{ id: 6, qty: 2 }], total: 1000 }]
  };

  var result = orders.cancel(db, 1007, 'Repeated test cancellation');

  assert.deepEqual(result, { ok: false, error: 'Order #1007 is already cancelled' });
  assert.equal(db.products[0].stock, 1);
  assert.equal(db.products[0].reserved, 0);
});

test('inventory release matches order lines by id and restores physical stock', function () {
  var products = [{ id: 6, stock: 1, reserved: 2 }];

  inventory.release(products, [{ id: 6, qty: 2 }]);

  assert.equal(products[0].stock, 3);
  assert.equal(products[0].reserved, 2);
});

test('releasing a productId reservation frees reserved stock without changing physical stock', function () {
  var products = [{ id: 6, stock: 1, reserved: 3 }];

  inventory.release(products, [{ productId: 6, qty: 2 }]);

  assert.equal(products[0].stock, 1);
  assert.equal(products[0].reserved, 1);
});
