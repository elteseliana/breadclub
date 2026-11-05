/*
 * The Bread Club: settings Eliana may need to change.
 *
 * apiUrl: the web app URL from Google Apps Script (see the owners' private setup guide).
 *         While it is empty, the order page sends people to the current Google Form instead.
 */
var BreadClubConfig = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbxQll0UVrAQF430H2LEJRAh7BOxeeQnWV-Spx_Zfhh2yjTDJRopptZzvcWf5AjPaqO6/exec',
  googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScGMVUOGpUVIJcJeUJD4ZQQKjjtO7Lz7QrCDOjez_7dTyQVBg/viewform',
  bitNumber: '054-911-2175',
  instagram: 'https://instagram.com/thebreadclub.il',
  instagramHandle: '@thebreadclub.il',
  bakers: [
    { name: 'Eliana Eltes', phone: '0549112175', display: '054-911-2175' },
    { name: 'Shayna Lightstone', phone: '0586786900', display: '058-678-6900' }
  ]
};

// For local testing only: http://localhost:8080/order.html?api=/api uses the preview server
// (?api=none shows the not-connected fallback).
// Ignored on the real website so nobody can send customers' orders somewhere else with a link.
(function () {
  var host = window.location.hostname;
  var override = new URLSearchParams(window.location.search).get('api');
  if (override && (host === 'localhost' || host === '127.0.0.1')) BreadClubConfig.apiUrl = override === 'none' ? '' : override;
})();
