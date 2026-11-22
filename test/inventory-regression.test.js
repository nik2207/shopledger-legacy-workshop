var assert = require('node:assert/strict');
var test = require('node:test');
var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

test('selling the exact available stock succeeds', function () {
  var products = [{ id: 1, name: 'Ghee', stock: 1, reserved: 0 }];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('selling the last available unit reduces sellable stock to zero', function () {
  var products = [{ id: 1, name: 'Ghee', stock: 1, reserved: 0 }];
  var items = [{ id: 1, qty: 1 }];

  assert.equal(inventory.check(products, items).ok, true);
  inventory.reserve(products, items);
  assert.equal(products[0].stock, 0);
  assert.equal(inventory.getSellableStock(products[0]), 0);
});

test('selling more than the available stock is rejected', function () {
  var products = [{ id: 1, name: 'Ghee', stock: 1, reserved: 0 }];

  assert.equal(inventory.check(products, [{ id: 1, qty: 2 }]).ok, false);
});

test('reserved stock is excluded from sellable stock while an exact sellable quantity is allowed', function () {
  var products = [{ id: 2, name: 'Chilli Powder', stock: 4, reserved: 3 }];

  assert.equal(inventory.getSellableStock(products[0]), 1);
  assert.deepEqual(inventory.check(products, [{ id: 2, qty: 1 }]), { ok: true });
  assert.equal(inventory.check(products, [{ id: 2, qty: 2 }]).ok, false);
});

test('cancelling a pending multi-item order restores each deducted quantity', function () {
  var db = {
    products: [
      { id: 6, stock: 1, reserved: 0 },
      { id: 4, stock: 22, reserved: 4 }
    ],
    orders: [{
      id: 1007,
      status: 'pending',
      paymentMode: 'cash',
      items: [{ id: 6, qty: 2 }, { id: 4, qty: 2 }],
      total: 1600
    }]
  };

  var result = orders.cancel(db, 1007, 'Regression test');

  assert.equal(result.ok, true);
  assert.equal(db.products[0].stock, 3);
  assert.equal(db.products[1].stock, 24);
});

test('cancellation restores physical stock and leaves independent reserved stock unchanged', function () {
  var db = {
    products: [{ id: 2, stock: 3, reserved: 3 }],
    orders: [{ id: 1008, status: 'pending', paymentMode: 'cash', items: [{ id: 2, qty: 1 }], total: 100 }]
  };

  var result = orders.cancel(db, 1008, 'Regression test');

  assert.equal(result.ok, true);
  assert.equal(db.products[0].stock, 4);
  assert.equal(db.products[0].reserved, 3);
  assert.equal(inventory.getSellableStock(db.products[0]), 1);
});

test('cancelling an already-cancelled order does not restore stock again', function () {
  var db = {
    products: [{ id: 6, stock: 3, reserved: 0 }],
    orders: [{ id: 1007, status: 'cancelled', paymentMode: 'cash', items: [{ id: 6, qty: 2 }], total: 1000 }]
  };

  var result = orders.cancel(db, 1007, 'Repeated regression test');

  assert.equal(result.ok, false);
  assert.equal(db.products[0].stock, 3);
});

test('successful cancellation keeps order status and restored inventory consistent', function () {
  var db = {
    products: [{ id: 6, stock: 1, reserved: 0 }],
    orders: [{ id: 1009, status: 'pending', paymentMode: 'cash', items: [{ id: 6, qty: 2 }], total: 1000 }]
  };

  var result = orders.cancel(db, 1009, 'Regression test');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(db.products[0].stock, 3);
  assert.equal(inventory.getSellableStock(db.products[0]), 3);
});

test('cancelling a missing order fails without changing order or inventory state', function () {
  var product = { id: 6, stock: 1, reserved: 0 };
  var order = { id: 1007, status: 'pending', paymentMode: 'cash', items: [{ id: 6, qty: 2 }], total: 1000 };
  var db = { products: [product], orders: [order] };

  var result = orders.cancel(db, 9999, 'Invalid order');

  assert.deepEqual(result, { ok: false, error: 'Order not found' });
  assert.equal(db.products[0].stock, 1);
  assert.equal(db.products[0].reserved, 0);
  assert.equal(db.orders[0].status, 'pending');
});
