const form = document.getElementById('contact-form');

if (form) {
  const payroll = form.elements.namedItem('payroll_required');
  const employeeField = document.getElementById('employee-count-field');
  const employeeCount = form.elements.namedItem('employee_count');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton.querySelector('[data-submit-label]');
  const status = document.getElementById('inquiry-status');
  const { serviceId, templateId, publicKey } = form.dataset;
  let isSending = false;

  function updatePayrollFields() {
    const needsPayroll = payroll.value === 'Yes';
    employeeField.hidden = !needsPayroll;
    employeeCount.disabled = !needsPayroll;
    employeeCount.required = needsPayroll;
  }

  payroll.addEventListener('change', updatePayrollFields);
  window.addEventListener('pageshow', updatePayrollFields);
  updatePayrollFields();

  const configured = Boolean(serviceId && templateId && publicKey);
  submitButton.disabled = !configured;
  if (!configured) {
    status.textContent = 'Online inquiries are unavailable right now. Please email us or give us a call.';
    status.dataset.state = 'error';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSending || !configured || !form.reportValidity()) return;

    const details = Object.fromEntries(
      Array.from(new FormData(form), ([name, value]) => [name, value.trim()]),
    );
    details.employee_count = details.payroll_required === 'Yes' ? details.employee_count : 'Not applicable';
    const message = [
      `Name: ${details.from_name}`,
      `Email: ${details.reply_to}`,
      `Type of business: ${details.business_type}`,
      `Bookkeeping support: ${details.bookkeeping_service}`,
      `Transactions per month: ${details.monthly_transactions}`,
      `Financial accounts: ${details.financial_accounts}`,
      `Payroll required: ${details.payroll_required}`,
      `Number of employees: ${details.employee_count}`,
      `Years in business: ${details.years_in_business === '0' ? 'Startup / less than one year' : details.years_in_business}`,
      `QuickBooks Online: ${details.quickbooks_status}`,
      `Additional information: ${details.additional_information || 'None provided'}`,
    ].join('\n');

    // Include both individual fields and a complete summary for contact templates.
    const templateParams = {
      ...details,
      name: details.from_name,
      email: details.reply_to,
      title: 'New bookkeeping inquiry',
      message,
    };
    const controls = Array.from(form.elements, (control) => [control, control.disabled]);
    isSending = true;
    controls.forEach(([control]) => { control.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Sending…';
    status.dataset.state = 'sending';
    status.textContent = 'Sending your inquiry…';

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams,
        }),
      });
      if (!response.ok) throw new Error('EmailJS rejected the inquiry');

      form.reset();
      status.dataset.state = 'success';
      status.textContent = 'Thank you! Your inquiry has been sent. We’ll be in touch soon.';
      status.focus();
    } catch {
      status.dataset.state = 'error';
      status.textContent = 'We couldn’t send your inquiry. Your details are still here. Please try again, email us, or give us a call.';
      status.focus();
    } finally {
      controls.forEach(([control, disabled]) => { control.disabled = disabled; });
      updatePayrollFields();
      form.removeAttribute('aria-busy');
      submitLabel.textContent = 'Send inquiry';
      isSending = false;
    }
  });
}
