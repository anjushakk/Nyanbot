/**
 * Simple cookie utility functions for authentication
 */

export const Cookies = {
    /**
     * Set a cookie
     */
    set(name: string, value: string, options: { expires?: number } = {}) {
        let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

        if (options.expires) {
            const date = new Date();
            date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1000);
            cookieString += `; expires=${date.toUTCString()}`;
        }

        cookieString += '; path=/';
        document.cookie = cookieString;
    },

    /**
     * Get a cookie value
     */
    get(name: string): string | undefined {
        const nameEQ = encodeURIComponent(name) + '=';
        const cookies = document.cookie.split(';');

        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return decodeURIComponent(cookie.substring(nameEQ.length));
            }
        }
        return undefined;
    },

    /**
     * Remove a cookie
     */
    remove(name: string) {
        document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    },
};
