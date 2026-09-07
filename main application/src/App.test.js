import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the GeoHub dashboard shell', () => {
  render(<App />);
  const title = screen.getByText(/GeoHub/i);
  expect(title).toBeInTheDocument();
});
