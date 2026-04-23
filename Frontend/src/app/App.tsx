import { useEffect } from "react";
import { SocketProvider } from "@/contexts/SocketContext";
import { useTheme } from "@/components/theme-provider";
import { normalizePreferenceBoolean } from "./app-auth";
import { AppContent } from "./AppContent";
import { useAppShellState } from "./useAppShellState";

import "../index.css";

export default function App() {
  const { setTheme } = useTheme();
  const appState = useAppShellState();
  const normalizedCurrentUserDarkMode = normalizePreferenceBoolean(appState.currentUser?.preferences?.darkMode, false);

  useEffect(() => {
    if (!appState.isAuthenticated) {
      setTheme("light");
      return;
    }

    setTheme(normalizedCurrentUserDarkMode ? "dark" : "light");
  }, [appState.isAuthenticated, normalizedCurrentUserDarkMode, setTheme]);

  return (
    <SocketProvider userId={appState.currentUser?.id || appState.currentUser?._id}>
      <AppContent
        currentUser={appState.currentUser}
        setCurrentUser={appState.setCurrentUser}
        isAuthenticated={appState.isAuthenticated}
        setIsAuthenticated={appState.setIsAuthenticated}
        unreadNotifications={appState.unreadNotifications}
        setUnreadNotifications={appState.setUnreadNotifications}
        unreadMessagesCount={appState.unreadMessagesCount}
        setUnreadMessagesCount={appState.setUnreadMessagesCount}
        activeCommunity={appState.activeCommunity}
        setActiveCommunity={appState.setActiveCommunity}
        feedFilter={appState.feedFilter}
        setFeedFilter={appState.setFeedFilter}
        posts={appState.posts}
        setPosts={appState.setPosts}
        hasMorePosts={appState.hasMorePosts}
        isFetchingPosts={appState.isFetchingPosts}
        handleLogout={appState.handleLogout}
        fetchPosts={appState.fetchPosts}
        fetchMorePosts={appState.fetchMorePosts}
        fetchUnreadMessagesCount={appState.fetchUnreadMessagesCount}
        fetchUnreadCount={appState.fetchUnreadCount}
      />
    </SocketProvider>
  );
}
