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
        currentHouseId: null,
      })
    ).toBeNull();
  });

  it('redirects unauthenticated users accessing (panel), (house), or empty/unknown segments to sign-in', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(panel)', 'home'],
        currentHouseId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(house)', 'choice'],
        currentHouseId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: [],
        currentHouseId: null,
      })
    ).toBe('/(auth)/sign-in');

    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['unknown'],
        currentHouseId: null,
      })
    ).toBe('/(auth)/sign-in');
  });

  it('allows unauthenticated users inside (auth) routes', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: false,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentHouseId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users without house away from (auth) and (panel) to (house)/choice, but allows (house)/*', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentHouseId: null,
      })
    ).toBe('/(house)/choice');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'tasks'],
        currentHouseId: null,
      })
    ).toBe('/(house)/choice');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(house)', 'choice'],
        currentHouseId: null,
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(house)', 'new'],
        currentHouseId: null,
      })
    ).toBeNull();
  });

  it('redirects authenticated users with house away from (auth), (house)/choice, and (house)/join to (panel)/home, but allows (house)/new and (panel)/*', () => {
    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(auth)', 'sign-in'],
        currentHouseId: 'house-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(house)', 'choice'],
        currentHouseId: 'house-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(house)', 'join'],
        currentHouseId: 'house-1',
      })
    ).toBe('/(panel)/home');

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(house)', 'new'],
        currentHouseId: 'house-1',
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'home'],
        currentHouseId: 'house-1',
      })
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isAuthenticated: true,
        loading: false,
        segments: ['(panel)', 'settings', 'change-password'],
        currentHouseId: 'house-1',
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
