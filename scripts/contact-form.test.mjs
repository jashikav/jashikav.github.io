import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/contact-form.js', import.meta.url), 'utf8');

function setup({ fetchResponse = async () => ({ ok: true }), configured = true, valid = true } = {}) {
  const handlers = {};
  const values = {
    from_name: ' Alex Owner ', reply_to: 'alex@example.com', business_type: 'LLC',
    bookkeeping_service: 'Monthly bookkeeping and cleanup', monthly_transactions: '125',
    financial_accounts: '4', payroll_required: 'No', employee_count: '3',
    years_in_business: '0', quickbooks_status: 'Need QuickBooks Online setup',
    additional_information: 'Help with last year’s books.',
  };
  const controls = Object.entries(values).map(([name, value]) => ({
    name, value, disabled: name === 'employee_count', required: false,
    addEventListener: (event, callback) => { handlers[event] = callback; },
  }));
  controls.namedItem = (name) => controls.find((control) => control.name === name);
  const label = { textContent: 'Send inquiry' };
  const button = { disabled: true, querySelector: () => label };
  controls.push(button);
  const status = { dataset: {}, textContent: '', focus() { this.focused = true; } };
  const employeeField = { hidden: true };
  const requests = [];
  const form = {
    elements: controls,
    dataset: configured ? { serviceId: 'service_yz86oe4', templateId: 'template_ksu5ow9', publicKey: 'public-test-key' } : {},
    attributes: {}, resetCount: 0,
    querySelector: () => button,
    reportValidity: () => valid,
    addEventListener: (event, callback) => { handlers[event] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    reset() {
      this.resetCount += 1;
      for (const control of controls) if (control.name) control.value = '';
    },
  };
  vm.runInNewContext(source, {
    document: { getElementById: (id) => ({ 'contact-form': form, 'employee-count-field': employeeField, 'inquiry-status': status })[id] },
    window: { addEventListener: (event, callback) => { handlers[event] = callback; } },
    FormData: class {
      constructor(target) {
        return target.elements.filter((control) => control.name && !control.disabled).map((control) => [control.name, control.value]);
      }
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options, payload: JSON.parse(options.body) });
      return fetchResponse();
    },
  });
  return {
    form, controls, button, label, status, employeeField, handlers, requests,
    submit: () => {
      let prevented = false;
      const pending = handlers.submit({ preventDefault() { prevented = true; } });
      assert.ok(prevented, 'Must prevent native form navigation');
      return pending;
    },
  };
}

test('sends all inquiry details, confirms success, and resets the form', async () => {
  const context = setup();
  assert.equal(context.button.disabled, false);
  await context.submit();
  const request = context.requests[0];
  assert.equal(request.url, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.equal(request.method, 'POST');
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.equal(request.payload.service_id, 'service_yz86oe4');
  assert.equal(request.payload.template_id, 'template_ksu5ow9');
  assert.equal(request.payload.user_id, 'public-test-key');
  const params = request.payload.template_params;
  assert.equal(params.from_name, 'Alex Owner');
  assert.equal(params.reply_to, 'alex@example.com');
  assert.equal(params.name, params.from_name);
  assert.equal(params.email, params.reply_to);
  assert.equal(params.employee_count, 'Not applicable');
  for (const value of ['Alex Owner', 'alex@example.com', 'LLC', 'Monthly bookkeeping and cleanup', '125', '4', 'No', 'Startup / less than one year', 'Need QuickBooks Online setup', 'Help with last year’s books.']) {
    assert.ok(params.message.includes(value), `Summary is missing ${value}`);
  }
  assert.equal(context.form.resetCount, 1);
  assert.equal(context.status.dataset.state, 'success');
  assert.equal(context.status.focused, true);
  assert.equal(context.button.disabled, false);
  assert.equal(context.employeeField.hidden, true);
  assert.equal(context.form.attributes['aria-busy'], undefined);
});

test('payroll selection and page restoration control employee validation and payload', async () => {
  const context = setup();
  const payroll = context.controls.namedItem('payroll_required');
  const employees = context.controls.namedItem('employee_count');
  assert.equal(employees.disabled, true);
  payroll.value = 'Yes';
  context.handlers.change();
  assert.equal(context.employeeField.hidden, false);
  assert.equal(employees.disabled, false);
  assert.equal(employees.required, true);
  payroll.value = 'No';
  context.handlers.change();
  assert.equal(employees.disabled, true);
  assert.equal(employees.required, false);
  payroll.value = 'Yes';
  context.handlers.pageshow();
  assert.equal(employees.required, true);
  await context.submit();
  assert.equal(context.requests[0].payload.template_params.employee_count, '3');
});

test('disables controls and prevents duplicate requests while sending', async () => {
  let finish;
  const context = setup({ fetchResponse: () => new Promise((resolve) => { finish = resolve; }) });
  const pending = context.submit();
  assert.ok(context.controls.every((control) => control.disabled));
  assert.equal(context.label.textContent, 'Sending…');
  assert.equal(context.form.attributes['aria-busy'], 'true');
  await context.submit();
  assert.equal(context.requests.length, 1);
  finish({ ok: true });
  await pending;
  assert.equal(context.label.textContent, 'Send inquiry');
  assert.equal(context.button.disabled, false);
});

for (const failure of ['rejection', 'network']) {
  test(`${failure} failure preserves details and enables retry`, async () => {
    let attempts = 0;
    const context = setup({ fetchResponse: async () => {
      if (attempts++ > 0) return { ok: true };
      if (failure === 'network') throw new TypeError('Network error');
      return { ok: false, status: 400 };
    } });
    await context.submit();
    assert.equal(context.form.resetCount, 0);
    assert.equal(context.controls.namedItem('reply_to').value, 'alex@example.com');
    assert.equal(context.status.dataset.state, 'error');
    assert.equal(context.button.disabled, false);
    assert.equal(context.form.attributes['aria-busy'], undefined);
    await context.submit();
    assert.equal(context.requests.length, 2);
    assert.equal(context.status.dataset.state, 'success');
  });
}

test('invalid forms and missing configuration do not send', async () => {
  for (const options of [{ valid: false }, { configured: false }]) {
    const context = setup(options);
    await context.submit();
    assert.equal(context.requests.length, 0);
    assert.equal(context.form.resetCount, 0);
    if (options.configured === false) assert.equal(context.button.disabled, true);
  }
  vm.runInNewContext(source, { document: { getElementById: () => null } });
});
