import React from 'react';
import ReactDOM from 'react-dom';
import Component from './component';

it('should pass', () => {
  const div = document.createElement('div');
  ReactDOM.render(<Component />, div);
  expect(div.innerHTML).toContain('Stub module content');
});

it('should support overrides for "testURL", from jest-yoshi.config', async () => {
  expect(window.location.href).toEqual('http://localhost:3000/?query=param');
});
