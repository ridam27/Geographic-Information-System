import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the GEOLITH PORTAL dashboard shell', () => {
  render(<App />);
  const title = screen.getByText(/GEOLITH/i);
  expect(title).toBeInTheDocument();
});
