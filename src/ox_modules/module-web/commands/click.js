/*
 * Copyright (C) 2015-present CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @summary Clicks on an element.
 * @description If the click causes new page to load, the command waits for page to load before
 *              proceeding.
 * @function click
 * @param {String|Element} locator - An element locator.
 * @param {Number=} timeout - Timeout in milliseconds. Default is 60 seconds.
 * @example <caption>[javascript] Usage example</caption>
 * web.init();//Opens browser session.
 * web.open("www.yourwebsite.com");// Opens a website.
 * web.click("id=NextPage");//Clicks on next page link.
 */
module.exports = async function(locator, timeout) {
    this.helpers.assertArgumentTimeout(timeout, 'timeout');
    this.retryCount = 3;
    this.firstError = null;
    this.clickJS = async (el) =>  {
        try {
            /*global document*/
            const retVal = await this.driver.execute(function(domEl) {
                // createEvent won't be available in IE < 9 compatibility mode
                if (!document.createEvent) {
                    if (document.createEventObject) {
                        var ev = document.createEventObject();
                        domEl.fireEvent('onclick', ev);
                    } else {
                        return; // fail silently
                    }
                }
                var clckEv = document.createEvent('MouseEvent');
                clckEv.initEvent('click', true, true);
                domEl.dispatchEvent(clckEv);
            }, el);

            /*
                {
                    error: 'no such element',
                    message: 'Error executing JavaScript',
                    stacktrace: ''
                }
            */
            if (retVal && retVal.error && retVal.message) {
                throw new Error(retVal.error + ' ' + retVal.message);
            }

        } catch (e) {
            if (this.retryCount) {
                if (!this.firstError) {
                    this.firstError = e;
                }
                --this.retryCount;
                await this.clickJS(el);
            } else {
                throw this.firstError;
            }
        }
    };

    var el = await this.helpers.getElement(locator, false, timeout);

    var clickable = await el.isClickable();
    if (clickable) {
        try {
            await el.click();
        } catch (e) {
            // chromedriver doesn't seem to support clicking on elements in Shadow DOM
            if (e.message.startsWith("javascript error: Cannot read property 'defaultView' of undefined")) {
                await this.clickJS(el);
            } else {
                throw e;
            }
        }
    } else {
        // if element is not clickable, try clicking it using JS injection
        await this.clickJS(el);
    }
};
