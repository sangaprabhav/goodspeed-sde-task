import { expect, test } from '@playwright/test';

const accessToken = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJlMmUtdXNlciIsImVtYWlsIjoiZTIrZUBleGFtcGxlLmNvbSIsImV4cCI6NDEwMjQ0NDgwMH0',
  'e2e-signature',
].join('.');

test('an authenticated mobile user can open usage without horizontal overflow', async ({
  page,
}) => {
  await page.route('http://127.0.0.1:54321/auth/v1/token?grant_type=password', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 4102444800,
        refresh_token: 'e2e-refresh-token',
        user: {
          id: 'e2e-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'e2e@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { display_name: 'E2E User' },
          created_at: '2026-01-01T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('http://127.0.0.1:3001/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (path === '/api/v1/usage/summary') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalPromptTokens: 23849,
          totalCompletionTokens: 2557,
          totalTokens: 26406,
          byModel: {
            'openai/gpt-4o': { promptTokens: 18555, completionTokens: 2000 },
            'openai/gpt-4o-mini': { promptTokens: 5294, completionTokens: 557 },
          },
          byDay: [{ date: '2026-06-13', tokens: 26406 }],
        }),
      });
      return;
    }

    if (path === '/api/v1/conversations' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-conversation',
          userId: 'e2e-user',
          title: 'New conversation',
          createdAt: '2026-06-13T00:00:00.000Z',
          updatedAt: '2026-06-13T00:00:00.000Z',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('e2e@example.com');
  await page.getByPlaceholder('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/chat\/e2e-conversation$/);
  await expect(page.getByRole('heading', { name: 'Knowledge base chat' })).toBeVisible();

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Usage' }).click();

  await expect(page).toHaveURL(/\/settings\/usage$/);
  await expect(page.getByRole('heading', { name: 'Usage' })).toBeVisible();
  await expect(page.getByText('26,406', { exact: true })).toBeVisible();

  const cards = page.getByTestId('usage-summary-card');
  await expect(cards).toHaveCount(3);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  for (const card of await cards.all()) {
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
