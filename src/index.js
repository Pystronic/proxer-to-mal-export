// ==UserScript==
// @name         proxer-to-mal-exporter
// @namespace    https://github.com/Pystronic/proxer-to-mal-export
// @version      2026-10-26
// @description  User-script to export your proxer watch list into a MAL supported format
// @author       Pystronic
// @match        https://proxer.me/ucp?s=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=proxer.me
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const EXPORT_BUTTON_TXT = "Export for MAL"

    const DISPLAY_MODE_LIST = 'LIST';
    const DISPLAY_MODE_TILES = 'TILES';
    const DISPLAY_MODE_IMAGES = 'IMAGES';


    // ToDO: re-add button on tab switch if missing
    // Todo: Validate that a supported tab is active before adding the button
    function setup() {
      const exportButton = addExportButton();
      exportButton.onclick = () => exportTabContent();
    }

    function exportTabContent() {
      if (getDisplayMode() === DISPLAY_MODE_IMAGES) {
        throw "Image-Display mode is not supported for export! Choose something else..."
      }

      const activeTab = getActiveTabName();
      console.log("active tab", activeTab)
      const tabStatusList = document.getElementById("ucp_list_content");
      if (tabStatusList == null) {
        throw `Status list for ${activeTab} not found!`
      }
      
      let statusEntries = [];
      if (isTableModeContent(tabStatusList)) {
        statusEntries = parseTableModeContent(tabStatusList, activeTab);
      }
      else if (isTileModeContent(tabStatusList)) {
        statusEntries = parseTileModeContent(tabStatusList, activeTab);
      }
      else {
        console.log("Actual result:", tabStatusList);
        throw "Could not parse status elements in current mode!"
      }

      // ToDo: Implement rest of the export!
      console.log("Test: Export called!", statusEntries)
    }

    function isTableModeContent(tabStatusList) {
      const statusWrapper = tabStatusList.children[0];
      if (statusWrapper == null) {
        throw "Expected wrapper around elements, however it did not exist!";
      }

      return statusWrapper.tagName === 'TABLE';
    }

    function parseTableModeContent(contentWrapper, tabType) {
      if (!isTableModeContent(contentWrapper)) {
        console.log("Recieved element:", contentWrapper);
        throw "Tried to parse table mode while not in table mode!"
      }
      
      // Get table rows
      const rawRows = contentWrapper.getElementsByTagName('TR');
      let tableRows = [...rawRows]
      if (rawRows[0].id !== "") {
        console.warn("Header row not found as first element! Actual: ", rawRows[0]);
      }
      else {
        tableRows = tableRows.slice(1);
      }

      // Table mode
      const statusEntries = tableRows.map(element => new ProxerStatusEntry(element, tabType));
      return statusEntries;
    }

    function isTileModeContent(tabStatusList) {
      const statusWrapper = tabStatusList.children[0];
      if (statusWrapper == null) {
        throw "Expected wrapper around elements, however it did not exist!";
      }

      return statusWrapper.tagName === 'DIV';
    }

    function parseTileModeContent(contentWrapper, tabType) {
      if (!isTileModeContent(contentWrapper)) {
        console.log("Recieved element:", contentWrapper);
        throw "Tried to parse tile mode while not in tile mode!"
      }
      
      // Tile mode
      const statusEntries = [...contentWrapper.children[0].children].map(element => new ProxerStatusEntry(element, tabType));
      return statusEntries;
    }

    function getDisplayMode() {
      const mainContainer = getTabMainContainer();
      const displaySelect = mainContainer.children[1].getElementsByClassName('menu');
      if (displaySelect.length !== 3) {
        console.info("Actual result: ", displaySelect);
        throw "Expected 3 display selection elements!"
      }

      if (isDisplayOptionActive(displaySelect[0])) {
        return DISPLAY_MODE_LIST
      }

      if (isDisplayOptionActive(displaySelect[1])) {
        return DISPLAY_MODE_TILES
      }

      if (isDisplayOptionActive(displaySelect[2])) {
        return DISPLAY_MODE_IMAGES
      }

      console.info("Actual result: ", displaySelect);
      throw "Could not determine active display option!"
    }

    function isDisplayOptionActive(element) {
      if (!element.classList.contains('menu')) {
        console.info("Actual result: ", element);
        throw "Element is not a display option!";
      }

      return element.classList.contains('active')
    }

    function getActiveTabName() {
      const tabList = document.getElementById('simple-navi')
      if (tabList == null) {
        throw "Tab-Navigation not found!"
      }
      const activeTab = tabList.getElementsByClassName('active');
      if (activeTab.length !== 1) {
        console.info("Actual result: ", activeTab);
        throw "Active tab not found!"
      }
      return activeTab[0].textContent
    }

    function addExportButton() {
      const mainContainer = getTabMainContainer();
      const rightMenu = mainContainer.children[1];

      const exportButton = document.createElement("button");
      exportButton.textContent = EXPORT_BUTTON_TXT;
      exportButton.setAttribute('style', 'height: 100%; margin-left: 3px;');
      exportButton.disabled = getDisplayMode() == DISPLAY_MODE_IMAGES;
      rightMenu.appendChild(exportButton);
      return exportButton
    }

    function getTabMainContainer() {
      const elements = document.getElementsByClassName('inner')
      if (elements.length !== 1) {
        console.info("Actual result: ", elements);
        throw "Inner element not identified."
      }

      const mainElement = elements[0]
      if (mainElement.childElementCount !== 4) {
        console.info("Actual result: ", mainElement);
        throw "Main element does not have the expected child count.";
      }
      return mainElement
    }

    /**
     * Attributes:
     * title, rating, currentProgress, maxProgress, status
     */
    // ToDO: comit after this
    class ProxerStatusEntry {
      _parseTableElement(tableElement) {
        this.title = tableElement.children[1].textContent.trim();
        this.rating = tableElement.children[3].textContent.trim();
        const entryProgress = tableElement.children[4];
        this._parseProgress(entryProgress.textContent);
        const rawStatus = tableElement.children[5].innerHTML;
        this.status = rawStatus.substr(0, rawStatus.indexOf('<')).trim();
      }

      _parseTileElement(tileElement) {
        const tileTitle = tileElement.children[1];
        this.title = tileTitle.children[0].textContent.trim();
        this.rating = tileElement.children[3].textContent.trim();
        const tileStatus = tileElement.children[4];
        const countElement = tileStatus.children[0];
        this._parseProgress(countElement.lastChild.textContent);
        this.status = tileStatus.children[1].lastChild.textContent.trim();
      }

      _parseProgress(rawEpisodes) {
        const [currentProgress, maxProgress] = rawEpisodes.split(" / ");
        this.currentProgress = currentProgress.trim();
        this.maxProgress = maxProgress.trim();
      }

      constructor(proxerStatusElement, type) {
        if (proxerStatusElement.tagName === 'TR') {
          this._parseTableElement(proxerStatusElement);
        }
        else if (proxerStatusElement.tagName === 'DIV') {
          this._parseTileElement(proxerStatusElement);
        }
        else {
          console.log("Actual result:", proxerStatusElement);
          throw `Could not parse proxer entry element! Type[${type}]`;
        }
        this.type = type;
      }

      toString() {
        return `ProxerStatusElement {` +
          `Title: ${this.title}` +
          `Rating: ${this.rating}` +
          `Episodes: ${this.currentProgress} / ${this.maxProgress}` +
          `Status: ${this.status}` +
        `}`;
      }
    }

    setup();
})();
