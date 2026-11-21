var assert = require('node:assert/strict');
var test = require('node:test');
var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('invoice GST matches the HSN rate used when the order was billed', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE', hsn: '1006', price: 100, qty: 2 }];
  var billed = pricing.computeTotals(items, '');
  var printed = invoice.computeInvoiceFigures({ id: 1001, items: items, total: billed.total });

  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.total, billed.total);
  assert.equal(printed.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
});

test('invoice coupon and GST totals match the order billed with a coupon', function () {
  var items = [{ id: 2, name: 'Rice', sku: 'RICE', hsn: '1006', price: 1000, qty: 1 }];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var printed = invoice.computeInvoiceFigures({ id: 1002, items: items, coupon: 'SAVE10', total: billed.total });

  assert.equal(printed.discount, billed.discount);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
  assert.doesNotMatch(invoice.render({ id: 1002, items: items, coupon: 'SAVE10', total: billed.total }), /differs from Order Ledger recorded total/);
});

test('invoice GST split matches checkout rounding when total GST is one cent', function () {
  var printed = invoice.computeInvoiceFigures({
    id: 1003,
    items: [{ name: 'Item', price: 0.05, qty: 1, gstRate: 10 }]
  });

  assert.equal(printed.tax, 0.01);
  assert.equal(printed.cgst, 0.01);
  assert.equal(printed.sgst, 0);
});
