import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App scaffold', () => {
  it('renders the project title', () => {
    render(<App />);
    expect(screen.getByText('Scribbler Simulator')).toBeInTheDocument();
  });
});
