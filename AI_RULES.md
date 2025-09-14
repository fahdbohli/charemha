# AI Rules for Codebase Modifications

This document outlines the core technologies used in this application and provides guidelines for using specific libraries.

## Tech Stack Overview

1.  **Framework**: **Next.js** for server-side rendering, routing, and API routes.
2.  **UI Library**: **React** for building interactive user interfaces.
3.  **Language**: **TypeScript** for type safety and improved code quality.
4.  **Styling**: **Tailwind CSS** for utility-first CSS styling.
5.  **UI Components**: **Shadcn UI** for pre-built, accessible, and customizable UI components.
6.  **Icons**: **Lucide React** for vector icons.
7.  **State Management**: Primarily **React Hooks** (`useState`, `useEffect`, `useContext`, `useCallback`, `useRef`) for local and global state.
8.  **Form Handling**: **React Hook Form** with **Zod** for form validation.
9.  **Notifications**: **Sonner** for toast notifications.
10. **Date Pickers**: **React Day Picker** with **date-fns** for date manipulation.
11. **Charting**: **Recharts** for data visualization.
12. **Theme Management**: **next-themes** for dark/light mode toggling.

## Library Usage Rules

*   **Next.js**: Utilize Next.js's file-system based routing (in the `app/` directory) for pages. Leverage its features for data fetching and rendering as appropriate (client components are currently in use).
*   **React**: Adhere to React best practices, including functional components, hooks, and component composition.
*   **TypeScript**: Always use TypeScript for new files and when modifying existing ones. Ensure proper typing for props, state, and functions.
*   **Tailwind CSS**: All styling should be done using Tailwind CSS utility classes. Avoid inline styles or separate CSS files unless absolutely necessary for complex, non-Tailwindable styles (which should be minimal).
*   **Shadcn UI**:
    *   **Prioritize existing components**: Before creating a new UI element, check if a suitable component exists in `components/ui`.
    *   **Do NOT modify `components/ui` files directly**: These are pre-built components. If a modification is needed, create a new component in `components/` that wraps or extends the Shadcn UI component, applying custom styling or logic there.
*   **Lucide React**: Use `lucide-react` for all icons.
*   **State Management**: Stick to React's built-in hooks for state management. Avoid external state management libraries unless a clear and significant need arises for complex global state.
*   **Form Handling**: Use `react-hook-form` for all form logic and `zod` for schema validation.
*   **Notifications**: Use `sonner` for displaying user feedback and notifications.
*   **Data Fetching**: Use the native `fetch` API or React's built-in data fetching patterns (e.g., `useEffect` with `fetch`) for data retrieval.
*   **File Structure**:
    *   `app/`: Contains Next.js pages and layout.
    *   `components/`: For reusable UI components.
    *   `hooks/`: For custom React hooks.
    *   `utils/`: For pure utility functions.
    *   `types/`: For TypeScript type definitions.
    *   `lib/`: For shared helper functions or configurations.
*   **Responsiveness**: All new UI elements and modifications should be responsive and work well across different screen sizes (mobile, tablet, desktop).
*   **Simplicity**: Keep code simple, elegant, and easy to understand. Avoid over-engineering.
*   **Error Handling**: Allow errors to bubble up naturally unless specific user-requested error handling is required (e.g., displaying a toast).