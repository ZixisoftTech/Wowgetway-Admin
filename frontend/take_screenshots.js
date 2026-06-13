import puppeteer from 'puppeteer-core';

(async () => {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  console.log('Navigating to dashboard login...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

  // 1. Wait for Login Page to load and log in
  await page.waitForSelector('button[type="submit"]');
  console.log('Clicking login submit button...');
  await page.click('button[type="submit"]');

  // Wait for sidebar navigation to load
  await page.waitForSelector('button');
  await new Promise(r => setTimeout(r, 1500));
  console.log('Logged in successfully!');

  // Navigate to "Manage Riders" page by clicking the sidebar link
  const buttons = await page.$$('button');
  let ridersBtn = null;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.trim().includes('Manage Riders')) {
      ridersBtn = btn;
      break;
    }
  }

  if (ridersBtn) {
    console.log('Navigating to Manage Riders section...');
    await ridersBtn.click();
  } else {
    console.error('Could not find Manage Riders button in sidebar');
    await browser.close();
    process.exit(1);
  }

  // Wait for riders table data to load and render (contains td.font-mono for Rider IDs)
  console.log('Waiting for riders table data to load...');
  await page.waitForSelector('td.font-mono', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 1000)); // brief animations stabilization

  // 1. Rider Listing Page Screenshot
  console.log('Capturing Rider Listing Page...');
  await page.screenshot({ path: '/Users/chetansmac/.gemini/antigravity/brain/5ca4673b-aaed-418a-a4b6-40ab12b710f6/rider_listing.png' });

  // 2. Add Rider Page Screenshot
  console.log('Opening Add Rider Page...');
  const addBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Add New Rider') || b.textContent.includes('Add Rider'));
  });
  if (addBtn && addBtn.asElement()) {
    await addBtn.asElement().click();
    console.log('Waiting for Add Rider Form...');
    await page.waitForFunction(() => document.body.innerText.includes('Register Fleet Rider') || document.body.innerText.includes('Register Rider'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing Add Rider Page...');
    await page.screenshot({ path: '/Users/chetansmac/.gemini/antigravity/brain/5ca4673b-aaed-418a-a4b6-40ab12b710f6/add_rider.png' });
    
    // Go back to list using "Cancel" button
    const backBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.trim() === 'Cancel');
    });
    if (backBtn && backBtn.asElement()) {
      await backBtn.asElement().click();
      await page.waitForSelector('td.font-mono', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 3. View Rider Details Page
  console.log('Opening View Rider Details...');
  // Find the eye icon button in the table row
  const viewBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.getAttribute('title') === 'View details' || b.innerHTML.includes('Eye') || b.outerHTML.includes('Eye'));
  });
  if (viewBtn && viewBtn.asElement()) {
    await viewBtn.asElement().click();
    console.log('Waiting for Rider Details Page to render...');
    await page.waitForFunction(() => document.body.innerText.includes('Rider Fleet Profile') || document.body.innerText.includes('Personal Profile'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000)); // wait for detail sub-animations
    console.log('Capturing View Rider Page...');
    await page.screenshot({ path: '/Users/chetansmac/.gemini/antigravity/brain/5ca4673b-aaed-418a-a4b6-40ab12b710f6/view_rider.png' });
  } else {
    console.warn('View details button not found');
  }

  // 4. Edit Rider Page Screenshot
  console.log('Opening Edit Rider Page...');
  const editBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Edit Settings') || b.textContent.includes('Edit Rider') || b.getAttribute('title') === 'Edit Rider');
  });
  if (editBtn && editBtn.asElement()) {
    await editBtn.asElement().click();
    console.log('Waiting for Edit Rider Form...');
    await page.waitForFunction(() => document.body.innerText.includes('Edit Rider Coordinates') || document.body.innerText.includes('Edit Rider'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));
    console.log('Capturing Edit Rider Page...');
    await page.screenshot({ path: '/Users/chetansmac/.gemini/antigravity/brain/5ca4673b-aaed-418a-a4b6-40ab12b710f6/edit_rider.png' });

    // Go back using Cancel button
    const backBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.trim() === 'Cancel');
    });
    if (backBtn && backBtn.asElement()) {
      await backBtn.asElement().click();
      await page.waitForSelector('td.font-mono', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));
    }
  } else {
    console.warn('Edit Rider button not found');
  }

  // 5. Mobile View Page Screenshot
  console.log('Adjusting to mobile viewport...');
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  console.log('Reloading to let React adjust to mobile environment...');
  await page.reload({ waitUntil: 'networkidle2' });

  // Login again on mobile if required
  const needsLogin = await page.evaluate(() => !!document.querySelector('button[type="submit"]'));
  if (needsLogin) {
    console.log('Logging in on mobile view...');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('Opening mobile sidebar menu...');
  const burgerBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => (b.innerHTML.includes('lucide-menu') || b.outerHTML.includes('Menu')) && b.offsetParent !== null);
  });
  if (burgerBtn && burgerBtn.asElement()) {
    await burgerBtn.asElement().click();
    await new Promise(r => setTimeout(r, 1000)); // wait for sidebar to open slide animation

    console.log('Clicking Manage Riders in mobile sidebar...');
    const mobileRidersBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.trim().includes('Manage Riders') && b.offsetParent !== null);
    });
    if (mobileRidersBtn && mobileRidersBtn.asElement()) {
      await mobileRidersBtn.asElement().click();
      await page.waitForSelector('td.font-mono', { timeout: 8000 });
      await new Promise(r => setTimeout(r, 1000)); // wait for layout stabilization
      console.log('Capturing Mobile View Page...');
      await page.screenshot({ path: '/Users/chetansmac/.gemini/antigravity/brain/5ca4673b-aaed-418a-a4b6-40ab12b710f6/mobile_view.png' });
    } else {
      console.error('Could not find Manage Riders in mobile sidebar');
    }
  } else {
    console.error('Could not find mobile menu hamburger button');
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
})().catch(err => {
  console.error('Error during screenshot generation:', err);
  process.exit(1);
});
