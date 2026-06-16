import React from "react";

export function CustomLink({ to, children, className, ...props }) {
  const handleClick = (e) => {
    // Only intercept normal left clicks without modifier keys
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      window.history.pushState({}, "", to);
      window.dispatchEvent(new Event("popstate"));
      
      // Scroll to top of the page on route change
      window.scrollTo(0, 0);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
