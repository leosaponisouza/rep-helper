jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useSegments: jest.fn(),
  Redirect: jest.fn(() => null),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
import { useSegments, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { AuthProtection, resolveAuthRedirect } from '../authProtection';

const mockUseAuth = useAuth as jest.Mock;
const mockUseSegments = useSegments as jest.Mock;
const mockRedirect = Redirect as unknown as jest.Mock;

describe('resolveAuthRedirect', () => {
  it('returns null while auth state is loading', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: true,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects unauthenticated users accessing (panel), (republic), or empty/unknown segments to sign-in', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(panel)', 'home'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: [],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['unknown'],
        currentRepublicId: null,
      })
    ).toBe('/(auth)/sign-in');
  });

  it('allows unauthenticated users inside (auth) routes', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users without republic away from (auth) and (panel) to (republic)/choice, but allows (republic)/*', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: null,
      })
    ).toBe('/(republic)/choice');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'tasks'],
        currentRepublicId: null,
      })
    ).toBe('/(republic)/choice');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: null,
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'new'],
        currentRepublicId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users with republic away from (auth), (republic)/choice, and (republic)/join to (panel)/home, but allows (republic)/new and (panel)/*', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'choice'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'join'],
        currentRepublicId: 'rep-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(republic)', 'new'],
        currentRepublicId: 'rep-1',
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'home'],
        currentRepublicId: 'rep-1',
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'settings', 'change-password'],
        currentRepublicId: 'rep-1',
      })
    ).toBeNull();
  });
});

describe('AuthProtection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users on (panel)/home without ever mounting protected children', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });
    mockUseSegments.mockReturnValue(['(panel)', 'home']);

    const childRenderSpy = jest.fn();
    function ProtectedChild() {
      childRenderSpy();
      return React.createElement(Text, null, 'Protected');
    }

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AuthProtection, null, React.createElement(ProtectedChild))
      );
    });

    expect(childRenderSpy).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalled();
    expect(mockRedirect.mock.calls[0][0]).toEqual({ href: '/(auth)/sign-in' });

    act(() => {
      tree.unmount();
    });
  });

  it('renders ActivityIndicator and never mounts children while loading on (panel)/home', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
    });
    mockUseSegments.mockReturnValue(['(panel)', 'home']);

    const childRenderSpy = jest.fn();
    function ProtectedChild() {
      childRenderSpy();
      return React.createElement(Text, null, 'Protected');
    }

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AuthProtection, null, React.createElement(ProtectedChild))
      );
    });

    expect(childRenderSpy).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(mockRedirect).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  it('bypasses global spinner and renders auth child while loading on (auth)/sign-in', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      user: null,
    });
    mockUseSegments.mockReturnValue(['(auth)', 'sign-in']);

    const childRenderSpy = jest.fn();
    function AuthChild() {
      childRenderSpy();
      return React.createElement(Text, null, 'Sign In');
    }

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AuthProtection, null, React.createElement(AuthChild))
      );
    });

    expect(childRenderSpy).toHaveBeenCalledTimes(1);
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    expect(mockRedirect).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  it('renders loading indicator and never mounts children when segments is transiently empty', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
    });
    mockUseSegments.mockReturnValue([]);

    const childRenderSpy = jest.fn();
    function ProtectedChild() {
      childRenderSpy();
      return React.createElement(Text, null, 'Protected');
    }

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        React.createElement(AuthProtection, null, React.createElement(ProtectedChild))
      );
    });

    expect(childRenderSpy).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);

    act(() => {
      tree.unmount();
    });
  });
});
