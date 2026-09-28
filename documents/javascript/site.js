/*
 +------------------------------------------------------------------------------+
 Project: Straightsell Standard Templates
 +------------------------------------------------------------------------------+
 Functions are namespaced using "SEL" and functions are called using
 the syntax: SEL.functionName(params);
 +------------------------------------------------------------------------------+
 */

var SEL = function() {
	return {

		SummaryCartURL: '/product_list/widgets/ajax_summary_cart.php',
		FullCartURL: '/product_list/widgets/ajax_full_cart.php',
		
		trim : function(s) {
			return s.replace(/^\s&#42;(\S&#42;(\s+\S+)&#42;)\s&#42;&#36;/,
					"&#36;1");
		},

		// Used in site.js only
		serializePlainObject: function(vForm) {
			var o = {};
			var a = vForm.serializeArray();
			$.each(a, function() {
				if (o[this.name] !== undefined) {
					if (!o[this.name].push) {
						o[this.name] = [o[this.name]];
					}
					o[this.name].push(this.value || '');
				} else {
					o[this.name] = this.value || '';
				}
			});
			return o;
		},

		// Used in site.js only
		turnSelectedFormElementsIntoPlainObject: function(vForm, elements) {
			var o = {};
			var a = vForm.serializeArray();
			$.each(a, function() {
				if (o[this.name] !== undefined) {
					var formKey = this.name;
					if($.grep(elements, function(n, i){return formKey.indexOf(n) >= 0;}).length > 0) {
						if (!o[this.name].push) {
							o[this.name] = [o[this.name]];
						}
						o[this.name].push(this.value || '');
					}
				} else {
					var formKey = this.name;
					if($.grep(elements, function(n, i){return formKey.indexOf(n) >= 0;}).length > 0) {
						o[this.name] = this.value || '';
					}
				}
			});
			return o;
		},

		// Used in site.js only - Simple Search and Brand Search
		URLEncode : function(clearString) {
			var output = '';
			var x = 0;
			clearString = clearString.toString();
			var regex = /(^[a-zA-Z0-9_.]*)/;

			while (x < clearString.length) {
				var match = regex.exec(clearString.substr(x));
				if (match != null && match.length > 1 && match[1] != '') {
					output += match[1];
					x += match[1].length;
				} else {
					if (clearString[x] == ' ')
						output += '+';
					else {
						var charCode = clearString.charCodeAt(x);
						var hexVal = charCode.toString(16);
						output += '%' + (hexVal.length < 2 ? '0' : '')
								+ hexVal.toUpperCase();
					}
					x++;
				}
			}
			return output;
		},

		// updates email reply to with entered email address and adds additional to field if receivecopy present and checked
		// JIRA STRSEL-27
		updateToken : function(frm) {
			// create the payload
			var emailTokenRequestData = {
				"Operation[]": "UpdateEmailToken",
				EMAIL_TOKEN: $('input[name="EMAIL_TOKEN"]').val(),
			};

			if( $('#ContactEmail').val() != "" ) {
				emailTokenRequestData.ADDRESS_FROM = $('#ContactEmail').val();
			}

			// send the request
			$.ajax({
				// The URL for the request - if url doesn't exist it posts to self
				// url: "/site/pages/contact_test.php",
				// Whether this is a POST or GET request
				type: "POST",
				// require a response before continuing (token setup msut complete before the SafeSendEmailTemplate request is sent)
				async: false,
				// The data to send (will be converted to a query string)
				data: emailTokenRequestData,
				// Code to run if the request succeeds; the response is passed to the function
				success: function( response ) {
					return true;
				},
				// Code to run if the request fails; the raw request and status codes are passed to the function
				error: function( xhr, status, errorThrown ) {
					$( "#result" ).text( xhr.responseText );
					return false;
				},
			});
		},


		// Form Function - Dynamically change state field based on country selected
		changeStates : function(form, readonly) {
			var country = form.Country.value;
			
			//set all the selectors to disabled and hidden
			$('.stateSelector').hide();
			$('.stateSelector select').prop('disabled', true);
			
			//if we have a valid handler, show and enable
			var relevantSelector = $('#States'+country);
			if(relevantSelector.length){
				$('#States'+country + ' select').val('');
				relevantSelector.show();
				if(readonly){
					// leave it disabled
				} else {
					$('#States'+country + ' select').prop('disabled', false);
				}
			} else {
				$('#StatesOther').show();
				form.StateOther.value = '';
				if(readonly){
					form.StateOther.setAttribute("readonly", true);
				} else {
					form.StateOther.readonly = false;
				}
			}
			
			//clear the value in state
			form.State.value = '';
		},
		
		// Checkout Form Function - Change all the address fields when the address selector is used
		setAddress: function(form, readonlyOnSet, readonlyOnRelease) {
			addressID = form.AddressSelect.value;
			if (addressID == '') {
				form.CountrySelector.value = "AU";
				form.Country.value = "AU";
				SEL.changeStates(form, readonlyOnRelease);
				
				form.Recipient.value = '';
				form.Address1.value = '';
				form.Address2.value = '';
				form.City.value = '';
				form.PostCode.value = '';
				form.Notes.value = '';
			} else {
				form.CountrySelector.value = Country[addressID];
				form.Country.value = Country[addressID];
				SEL.changeStates(form, readonlyOnSet);
				
				relevantState = $('#State'+Country[addressID]);
				if(relevantState.length){
					relevantState.val(State[addressID]);
				} else {
					form.StateOther.value = State[addressID];
				}
				form.State.value = State[addressID];
				
				form.Recipient.value = AddressRecipient[addressID];
				form.Address1.value = Address1[addressID];
				form.Address2.value = Address2[addressID];
				form.City.value = City[addressID];
				form.PostCode.value = PostCode[addressID];
				form.Notes.value = SpecialInstructions[addressID];
			}
			
			if(form.SaveAddress){
				form.SaveAddress.checked = false;
			}
			
			if(readonlyOnRelease && addressID == '' || readonlyOnSet && addressID != ''){
				//form.Recipient.setAttribute("readonly", true);
				form.Address1.setAttribute("readonly", true);
				form.Address2.setAttribute("readonly", true);
				form.City.setAttribute("readonly", true);
				form.PostCode.setAttribute("readonly", true);
				//form.Notes.setAttribute("readonly", true);
				form.CountrySelector.setAttribute("disabled", true);
				
				if(form.SaveAddress){
					form.SaveAddress.setAttribute("disabled", true);
				}
			} else {
				//form.Recipient.removeAttribute("readonly");
				form.Address1.removeAttribute("readonly");
				form.Address2.removeAttribute("readonly");
				form.City.removeAttribute("readonly");
				form.PostCode.removeAttribute("readonly");
				//form.Notes.removeAttribute("readonly");
				form.CountrySelector.removeAttribute("disabled");
				
				if(form.SaveAddress){
					form.SaveAddress.removeAttribute("disabled");
				}
			}
		},

		// Validation - Contact, Request Information, Request Quote
		checkContactForm : function() {
			var frm = document.getElementById("ContactForm");
			var vEmail = frm.ContactEmail.value;

			frm.captcha.value = frm.captcha.value.toUpperCase();

			SEL.updateToken(frm);
			return true;
		},


		// Validation - Registration Form
		checkRegForm : function() {
			var frm = document.getElementById("AddUserForm");

			// set the admin values from default form field entries
			frm.AdminName.value = frm.ContactName.value;
			frm.AdminPhone.value = frm.ContactPhone.value;
			frm.AdminPassword.value = frm.Password.value;
			frm.AdminEmail.value = frm.Email.value;

			// Set the Username hidden field to the Email Address value, if the Global Parameter "EmailAsUsername_Anonymous" is set to FALSE
			if ($("#UserName").length && frm.UserName.value != "1") {
				frm.AdminUserName.value = frm.UserName.value;
				
			} else {
				frm.UserName.value = frm.Email.value;
				frm.AdminUserName.value = frm.Email.value;
			}
			
			frm.captcha.value = frm.captcha.value.toUpperCase();

			return true;
		},
			
		// Validation - Newsletter Signup
		checkMailchimpSignup: function(){
			var frm = document.getElementById("newsletterSignupForm");
			var vEmail = frm.ContactEmail.value;

			if (frm.ContactName.value == "") {
				alert("Please enter your Contact Name.");
				frm.ContactName.focus();
				return false;
			} else if (frm.ContactEmail.value == "") {
				alert("Please enter an Email Address.");
				frm.ContactEmail.focus();
				return false;
			} else if ((frm.ContactEmail.value != "") && (vEmail.indexOf("@") == -1 || vEmail.indexOf(".") == -1)) {
				alert("Please enter a valid Email Address.");
				frm.ContactEmail.focus();
				return false;
			}

			// mailchimp api subscription
			frm.elements["MailchimpEmail"].value = frm.ContactEmail.value;
			frm.elements["MailchimpName"].value = frm.ContactName.value;

			// if address fields are present check them
			if (frm.displayAddress.value == "1") {
				var vDeliveryCountrySelect = frm.elements["Country"];
				var selectedState = frm.State.value; //returns selected state
				if (SEL.trim(frm.Address1.value) == "") {
					alert("Please enter your Address");
					frm.Address1.focus();
					return false;
				} else if (SEL.trim(frm.City.value) == "") {
					alert("Please enter your City / Suburb");
					frm.City.focus();
					return false;
				} else if (SEL.trim(selectedState) == "") {
					alert("Please enter your State");
					//stateList.focus();
					return false;
				} else if (SEL.trim(frm.PostCode.value) == "") {
					alert("Please enter your Postcode");
					frm.PostCode.focus();
					return false;
				} else {
					frm.elements["MailchimpAddress1"].value = frm.Address1.value;
					frm.elements["MailchimpAddress2"].value = frm.Address2.value;
					frm.elements["MailchimpCity"].value = frm.City.value;
					frm.elements["MailchimpState"].value = selectedState;
					frm.elements["MailchimpPostcode"].value = frm.PostCode.value;
					frm.elements["MailchimpCountry"].value = vDeliveryCountrySelect.options[vDeliveryCountrySelect.selectedIndex].value;
				}
			}
			
			if(frm.captcha){
				frm.captcha.value = frm.captcha.value.toUpperCase();
			}

			return true;
		},


		// Validation (ADMIN) - Edit Buyer, Edit Account
		checkBuyerDetailsForm : function(frm) {
			var selectedState = frm.State.value; //returns selected state

			frm.AdminName.value = frm.ContactName.value;
			frm.AdminPhone.value = frm.ContactPhone.value;
			frm.AdminEmail.value = frm.ContactEmail.value;
			frm.State.value = selectedState;
			return true;
		},


		// Validation (ADMIN) - Add User
		checkAddUserForm : function(frm){
			
			// Set the Username hidden field to the Email Address value, if the Global Parameter "EmailAsUsername_Anonymous" is set to FALSE
			if ($("#UserName").length && frm.UserName.value == "1") {
				frm.UserName.value = frm.Email.value;
			}
			frm.Name.value = frm.ContactName.value;
			frm.Phone.value = frm.ContactPhone.value;
			frm.PasswordRepeat.value = frm.RetypePassword.value;
			return true;
		},


		// Validation (ADMIN) - Edit User (address update)
		checkEditUserForm : function(frm) {
			var vEmail = frm.Email.value;

			if ($("#UserName").length && frm.UserName.value == "1") {
				frm.UserName.value = frm.Email.value;
			}
			frm.Name.value = frm.ContactName.value;
			frm.Phone.value = frm.ContactPhone.value;
			return true;
		},


		// Validation (ADMIN) - Edit User (password update)
		checkEditUserPasswordForm : function(frm) {
			if (frm.RetypePassword.value == "" || frm.Password.value != frm.RetypePassword.value){
				alert("Password Mismatch - Please repeat the Password.");
				frm.RetypePassword.focus();
				return false;
			} else {
				return true;
			}
		},


		// Validation (ADMIN) - Address Add, Address Edit
		checkAddressForm : function(frm){

			frm.SpecialInstructions.value = frm.Notes.value;
			frm.CountryCode.value = frm.Country.value;
			return true;
		},

		// Simple Search - Get terms and rewrite URL
		checkSimpleSearch : function(frm, vURL) {
			if (frm.searchfilter.value == ""
					|| frm.searchfilter.value == "Search Products") {
				alert("Please enter a search term");
				frm.searchfilter.focus();
				frm.searchfilter.select();
				return false;
			}

			searchValue = frm.searchfilter.value;
			searchValue = searchValue.replace(/=/g, "_equals_");
			searchValue = searchValue.replace(/\//g, "_or_");
			searchValue = searchValue.replace(/&/g, "_and_");
			searchValue = searchValue.replace(/-/g, "_dash_");
			searchValue = searchValue.replace(/ /g, "-");
			searchValue = SEL.URLEncode(searchValue);

			location.href = vURL + searchValue + "/sf/pl.php" + window.location.search;
			return false;
		},

		checkAddToCart: function(cartForm){
			//spinner
			if (typeof SEL.AddToCartText == 'undefined') {
				SEL.AddToCartText = cartForm.AddToCartSubmit.innerHTML;
			}
			cartForm.AddToCartSubmit.innerHTML = '<i class="fas fa-spin fa-spinner"></i>';
			
			$.get(SEL.SummaryCartURL, $(cartForm).serializeArray(), function(response, status, xhr) {
				$("#ajaxSummaryCart").html(response);
				$("#ajaxSummaryCartMini").html(response);
				
				if (status == "error") {
					alert("An error occurred: " + xhr.status + " " + xhr.statusText);
					cartForm.AddToCartSubmit.innerHTML = SEL.AddToCartText;
				} else {
					// reset the spinner
					cartForm.reset();
					cartForm.AddToCartSubmit.innerHTML = '<i class="fas fa-check"></i>';
					setTimeout(function(){cartForm.AddToCartSubmit.innerHTML = SEL.AddToCartText}, 2000);
				}
			});
			
			//On quick order, return focus to the quick order filter input
			if($('#qoProductCodeInput').length){
				$('#qoProductCodeInput').select()
			}
			return false;
		},
		
		// Validation - Add to Favourites Button
		checkAddToFavouritesProductList: function(vProdCode,vProdNum,vVHN){ // Add to Favourites validation - Product List
			var vForm = document.getElementById("AddToCartForm" + vProdNum);
			var vInfoDiv = "#favouriteInfo_" + vProdNum;
			
			if (typeof SEL.AddToFavouritesText == 'undefined') {
				SEL.AddToFavouritesText = $(vInfoDiv).html();
			}
			
			$(vInfoDiv).html('<i class="fas fa-spin fa-spinner"></i>');
			var vFavNoOptionsURL = vVHN + 'product_list/widgets/ajax_add_favourite.php?Operation=CreateFavourite&GroupName=Unassigned&ProductCode[' + encodeURIComponent(vProdCode) + ']=' + encodeURIComponent(vProdCode);
			
			$.get(vFavNoOptionsURL, function(response, status, xhr) {
				if (status == "error") {
					var msg = "An error occurred: ";
					$("#ajaxMsg").html(msg + xhr.status + " " + xhr.statusText);
					$(vInfoDiv).html(SEL.AddToFavouritesText);
				} else {
					$(vInfoDiv).html('<i class="fas fa-check"></i>');
					setTimeout(function(){$(vInfoDiv).html(SEL.AddToFavouritesText);}, 2000);
				}
			});
		},


		// Validation - Add to Account Manager Favourites
		checkAddToAcctMgrFavourites: function(vProdCode,vProdNum,vVHN){
			var vForm = document.getElementById("AddToCartForm" + vProdNum);
			var vInfoDiv = "#favouriteAcctMgrInfo_" + vProdNum;
			
			if (typeof SEL.AddToAMFavouritesText == 'undefined') {
				SEL.AddToAMFavouritesText = $(vInfoDiv).html();
			}
			
			$(vInfoDiv).html('<i class="fas fa-spin fa-spinner"></i>');
			var vFavNoOptionsURL = vVHN + 'product_list/widgets/ajax_add_favourite.php?Operation=CreateSellerUserFavourite&ProductCode[' + encodeURIComponent(vProdCode) + ']=' + encodeURIComponent(vProdCode);
			
			$.get(vFavNoOptionsURL, function(response, status, xhr) {
				if (status == "error") {
					var msg = "An error occurred: ";
					$("#ajaxMsg").html(msg + xhr.status + " " + xhr.statusText);
					$(vInfoDiv).html(SEL.AddToAMFavouritesText);
				} else {
					$(vInfoDiv).html('<i class="fas fa-check"></i>');
					setTimeout(function(){$(vInfoDiv).html(SEL.AddToAMFavouritesText);}, 2000);
				}
			});
		},
		
		// Option dropdown selector, shows and hides the relevant detail block
		selectOption : function(UID) {
			$('.option-hide').hide();
			if (UID){
				$('.option-placeholder').hide();
				$('.option'+ UID).show();
			}
		},
		
		// Menu options on Detail - filter the second dimension of options
		filterOptions : function(filterValue) {
			var target = $("#options-menu2");
			var options = target.children();
			
			options.hide();
			$('.option-placeholder').show();
			$('#option2default').show();
			
			target.prop('disabled', false);
			
			var validCount = 0;
			var singleValue; //track this in case there's only one valid option 
			target.val("");
			options.each(function(index) {
				if($(this).data("dimension1") == filterValue) {
					$(this).show();
					validCount++;
					if(validCount == 1){
						singleValue = this.value;
					}
				}
			})
			if(validCount == 1){
				target.val(singleValue); //if there's one option, automatically select it
			}
			SEL.selectOption(target.val());

			// Future: if there's an equivalent dim2 after you change dim1, select it automatically
		},
		
		// Get QuickOrder Product List
		QOTimer: false,
		triggerQuickOrderList: function(e) {
			if(!SEL.QOTimer && e.keyCode != 13) { //don't run on enter
				SEL.QOTimer = setTimeout(function(){SEL.processQuickOrderList()}, 750);
			}
		},
			
		processQuickOrderList: function(force) {
			if(force){
				// we must use exactly what is entered, not some partial. Kill existing timers and gets and lock out new ones.
				if(SEL.QOTimer){
					clearTimeout(SEL.QOTimer);
				}
				if(SEL.QOGet){
					SEL.QOGet.abort();
				}
			}
			var listURL = '/site/widgets/quick_order_list.php';
			var target = $('#qoResults');
			SEL.QOTimer = false;
			var inputString = $('#qoProductCodeInput').val();
			if(inputString){
				SEL.QOGet = $.get(listURL, {searchString:inputString}, function(data){
					if(force){
						target.html(data);
						$('.cartQty').first().select();
					}
					else if($('#qoProductCodeInput').is(":focus")){
						target.html(data);
					}
				});
			} else {
				target.html('');
			}
		},

		// Recalculate Cart
		recalculateCart: function(){
			var cartForm = document.getElementById("ShoppingCartForm");
			var warningText = "";

			$.get(SEL.SummaryCartURL, $(cartForm).serializeArray(), function(summaryResponse, status, xhr) {
				$("#ajaxSummaryCart").html(summaryResponse);
				$("#ajaxSummaryCartMini").html(summaryResponse);
				
				if (status == "error") {
					alert("An error occurred: " + xhr.status + " " + xhr.statusText);
				} else {
					$("#ajaxFullCart").load(SEL.FullCartURL, function(response, status, xhr) {
						if (status == "error") {
							alert("An error occurred: " + xhr.status + " " + xhr.statusText);
						}
					});
				}
			});
		},


		// Clear Cart
		confirmClearCart: function() {
			if (confirm("Are you sure you want to clear the cart?")) {
				window.location.href = "/cart.php?Operation[0]=ClearCart";
			}
		},

		// Remove Item From Cart
		confirmRemoveCart: function(vIndex) {
			//hide the cart row from the form, zero the item, then call recalculate
			if (confirm("Are you sure you want to remove this item from the cart?")) {
				$("#cartRow"+vIndex).hide();
				$("#cartQty"+vIndex).val(0);
				
				SEL.recalculateCart();
			}
		},

		// Save Cart
		saveCart: function(){
			if (typeof SEL.saveCartText == 'undefined') {
				SEL.saveCartText = $("#SaveCart").html();
			}
			
			if (confirm("This Shopping Cart will be saved. You can access it via the Saved Carts option in your Account Menu.\n\nContinue?")) {
				$("#SaveCart").html('<i class="fas fa-spin fa-spinner"></i>');
				$.get(SEL.SummaryCartURL, $("#SaveCartForm").serializeArray(), function(response, status, xhr) {
					$("#ajaxSummaryCart").html(response);
					$("#ajaxSummaryCartMini").html(response);

					if (status == "error") {
						alert("An error occurred: " + xhr.status + " " + xhr.statusText);
					} else {
						$("#SaveCart").html(SEL.saveCartText);
					}
				});
			}
		},

		// Restore Cart
		confirmRestoreSavedCart : function() {
			if (confirm("This will restore your saved cart and merge it\nwith any currently active cart.\n\nContinue?")) {
				return true;
			} else {
				return false;
			}
		},

		// Delete Saved Cart
		confirmRemoveSavedCart : function(vCartID, vURL) {
			if (confirm("This will delete the selected saved cart.\n\nContinue?")) {
				window.location.href = vURL
						+ "admin/pages/saved_carts.php?ShoppingCartID="
						+ vCartID + "&Operation=RemoveShoppingCart";
			}
		},

		// Restore Previous Order
		confirmReorderCart : function() {
			if (confirm("This will restore your previous order and merge it\nwith any currently active cart.\n\nContinue?")) {
				return true;
			} else {
				return false;
			}
		},

		// Delete Favourite
		confirmRemoveFavourite: function(vProdID, vURL) {
			if (confirm("This will delete the selected product from your favourites.\n\nContinue?")) {
				window.location.href = vURL
						+ "admin/pages/favourites.php?ProductCode[" + vProdID + "]="
						+ vProdID + "&GroupName=&Operation=DeleteFavourite";
			}
		},


		// Delete All Favourites
		deleteAllFavourites: function(vForm, vVHN) {

			if (confirm("Are you sure you want to remove all Favourites?")) {
				vForm.elements["Operation[0]"].value = "DeleteFavourite";
				var vFormData = SEL.serializePlainObject($(vForm));

				vForm.submit();
			}
		},


		// Delete Account Manager Favourite
		confirmRemoveAMFavourite: function(vProdID, vURL) {
			if (confirm("This will delete the selected product from your favourites.\n\nContinue?")) {
				window.location.href = vURL
						+ "admin/pages/favourites_accountmanager.php?ProductCode[" + vProdID + "]="
						+ vProdID + "&GroupName=&Operation=DeleteSellerUserFavourite";
			}
		},


		// Delete All Account Manager Favourites
		deleteAllAMFavourites: function(vForm, vVHN) {
			var vInfoDiv = "#favouriteInfo_Delete";
			var vAjaxLoadImg = '<img src="' + vVHN + 'documents/ajax_loader.gif " alt="" />';

			if (confirm("Are you sure you want to remove all Favourites?")) {
				vForm.elements["Operation[0]"].value = "DeleteSellerUserFavourite";
				var vFormData = SEL.serializePlainObject($(vForm));
				
				$(vInfoDiv).html(vAjaxLoadImg).show();
				vForm.submit();
			}
		},

		searchTimerActive: false,
		triggerSearchSuggestions : function(searchForm, vVHN) {
			if(SEL.searchTimerActive){
				//do nothing
			} else {
				SEL.searchTimerActive = true;
				setTimeout(SEL.processSearchSuggestions, 750, searchForm, vVHN);
			}
		},
		//set a flag that we are waiting
		//clear this when we get suggestions back
		//if flag is set, do nothing
		//else setTimeout and callback processSearchSuggestions
		
		
		// CUSTOM: Get Search Suggestion List
		processSearchSuggestions : function(searchForm, vVHN) {
			
			var vFormData = SEL.serializePlainObject($(searchForm));
			var parentNode = searchForm.parentNode;
			var suggestionPane = parentNode.getElementsByClassName("searchSuggestionPane")[0];
			var dropdown = parentNode.getElementsByClassName("dropdown-menu")[0];
			var context = searchForm.context.value;
			
			$.post(vVHN + "getSearchSuggestions", vFormData, function(response, status, xhr) {
				if (status == "error") {
					var msg = "An error occurred: ";
					$("#ajaxMsg").html(msg + xhr.status + " " + xhr.statusText);
				} else {
					suggestionPane.innerHTML = response;
					if(!dropdown.classList.contains("show") && response.includes("<li")) {
						$('#suggestion-drop-' + context).trigger('click.bs.dropdown');
					}
					if(dropdown.classList.contains("show") && !response.includes("<li")) {
						$('#suggestion-drop-' + context).trigger('click.bs.dropdown');
					}
					
					
					// push the response into a results pane of some kind
					// display the pane
					// remove the pane if we lose focus on it
				}
				SEL.searchTimerActive = false;
			});
		},


		//*** PAYMENT PAGES FUNCTIONS ***//
		// Validation (Check Out) - Contact Details
		submitContactAndDeliveryForm : function() {
			var frm = document.getElementById("frmContactAndDelivery");

			//Fallback check to catch if state hasn't been selected. This sucks but we were getting some orders through without states
			//  and we don't have a replication to find the real problem yet.
			if(!frm.State.value && (frm.Country.value == 'AU' || frm.Country.value == 'US' || frm.Country.value == 'CA')){
				alert("Please enter your State");
				return false;
			}
			
			//assign the input fields to the hidden delivery address fields
			frm.elements["DayTimePhone"].value = frm.ContactPhone.value.replace(/ |\(|\)|-/g, "");
			frm.elements["Delivery[Address1]"].value = frm.Address1.value;
			frm.elements["Delivery[Address2]"].value = frm.Address2.value;
			frm.elements["Delivery[Suburb]"].value = frm.City.value;
			frm.elements["Delivery[PostCode]"].value = frm.PostCode.value;
			document.getElementById("Delivery[Country]").value = frm.Country.value;
			document.getElementById("Delivery[State]").value = frm.State.value;
			if (frm.AddressSelect) {
				frm.elements["Delivery[AddressID]"].value = frm.AddressSelect.value;
			}


			//check if the subscribe newsletter is ticked on and if so populate stuff to update
			if (frm.NewsletterCheckboxVisible.value == "1" && frm.NewsletterType.value == "MC") {
				if (frm.MailchimpNewsletterSignup.checked == 1) {
					// mailchimp api subscription
					frm.elements["SetNewsletterOperation"].value = "MailchimpSignup";
					frm.elements["SetNewsletterOperation"].name = "Operation[4]";
					frm.elements["MailchimpEmail"].value = frm.ContactEmail.value;
					frm.elements["MailchimpName"].value = frm.ContactName.value;
					frm.elements["MailchimpAddress1"].value = frm.Address1.value;
					frm.elements["MailchimpAddress2"].value = frm.Address2.value;
					frm.elements["MailchimpCity"].value = frm.City.value;
					frm.elements["MailchimpState"].value = frm.State.value;
					frm.elements["MailchimpPostcode"].value = frm.PostCode.value;
					frm.elements["MailchimpCountry"].value = frm.Country.value;
				}
			}
			// end newsletter check

			//check if the save address is ticked on and if so populate stuff to update
			if (frm.SaveAddress.checked == 1) {
				frm.elements["Operation5"].value = "AddBuyerAddress";
				frm.elements["Operation5"].name = "Operation[5]";
				frm.elements["AddressName"].value = frm.Recipient.value;
				frm.elements["CountryCode"].value = frm.Country.value;
				frm.State.value = frm.State.value;
				frm.elements["SpecialInstructions"].value = frm.Notes.value;
			}
			// end save address
			
			$("#address-fieldset").hide();

			
			var data = $("#frmContactAndDelivery").serializeArray();
			$("#checkoutFreight").load("/payments/widgets/freight", data, function(response, status, xhr) {
				if (status == "error") {
					alert("An error occurred: " + xhr.status + " " + xhr.statusText);
				} else {
					$('#contactSummaryWrapper').append($('#contactSummary'));
					$("#checkoutDelivery").hide();
					$("#contactSummary").show();
					$("#editButtonContact").show();
					
					$("#checkoutCartSummary").load("/payments/widgets/order_summary",'' , function(response, status, xhr) {
						if (status == "error") {
							$("#checkoutCartSummary").html("Failed to load cart summary");
						}
					});
					
					$('html, body').animate({
						'scrollTop': document.querySelector("#freightAnchor").getBoundingClientRect().top + window.scrollY
					});
				}
			});
			
			
			
			return false;

		},


		// Validation - Add Promo Code
		checkPromotionCodeForm : function(frm) {
			if (SEL.trim(frm.promotioncode.value) == "") {
				alert("Please enter a Promotion Code");
				frm.promotioncode.focus();
				return false;
			}
			
			return true;
		},


		submitFreight : function() {
			$('html, body').stop();
			
			var data = $("#frmFreight").serializeArray();
			$("#checkoutTerms").load("/payments/widgets/terms", data, function(response, status, xhr) {
				if (status == "error") {
					alert("An error occurred: " + xhr.status + " " + xhr.statusText);
				} else {
					$('#freightSummaryWrapper').append($('#freightSummary'));
					$("#checkoutFreight").hide();
					$("#freightSummary").show();
					$("#editButtonFreight").show();
					
					$("#checkoutCartSummary").load("/payments/widgets/order_summary",'' , function(response, status, xhr) {
						if (status == "error") {
							$("#checkoutCartSummary").html("Failed to load cart summary");
						}
					});
					
					$('html, body').animate({
						'scrollTop': document.querySelector("#termsAnchor").getBoundingClientRect().top + window.scrollY
					});
				}
			});
			
			return false;
		},
		
		// Validation (Check Out) - Freight and Terms
		submitTerms : function() {
			$('html, body').stop();
			
			termsForm = document.getElementById('frmTerms');
			divElem = document.getElementById('forceCredit');
			id = termsForm.PaymentTerm.value;
			if (document.getElementById(id + '[AllowOnlineCreditCard]').value == 1) {
				var nextPage = "/payments/pages/order_payment";
			} else {
				var nextPage = "/payments/widgets/confirm";
			}
			var data = $("#frmTerms").serializeArray();
			$("#checkoutPayment").load(nextPage, data, function(response, status, xhr) {
				if (status == "error") {
					alert("An error occurred: " + xhr.status + " " + xhr.statusText);
				} else {
					$('#termsSummaryWrapper').append($('#termsSummary'));
					$("#checkoutTerms").hide();
					$("#termsSummary").show();
					$("#editButtonTerms").show();
					
					$("#checkoutCartSummary").load("/payments/widgets/order_summary",'' , function(response, status, xhr) {
						if (status == "error") {
							$("#checkoutCartSummary").html("Failed to load cart summary");
						}
					});
					
					$('html, body').animate({
						'scrollTop': document.querySelector("#confirmAnchor").getBoundingClientRect().top + window.scrollY
					});
				}
			}).show();
			
			$(".paymentAlert").hide();
			return false;
		},
		
		checkoutBackstepContact : function() {
			$("#checkoutDelivery").show();
			$("#editButtonContact").hide();
			$("#contactSummaryWrapper").html('');
			$("#editButtonFreight").hide();
			$("#checkoutFreight").html('');
			$("#freightSummaryWrapper").html('');
			$("#editButtonTerms").hide();
			$("#checkoutTerms").html('');
			$("#termsSummaryWrapper").html('');
			$("#checkoutPayment").html('');
			$(".paymentAlert").hide();
		},
		
		checkoutBackstepFreight : function() {
			$("#editButtonFreight").hide();
			$("#checkoutFreight").show();
			$("#freightSummaryWrapper").html('');
			$("#editButtonTerms").hide();
			$("#checkoutTerms").html('');
			$("#termsSummaryWrapper").html('');
			$("#checkoutPayment").html('');
			$(".paymentAlert").hide();
		},
		
		checkoutBackstepTerms : function() {
			$("#editButtonTerms").hide();
			$("#checkoutTerms").show();
			$("#termsSummaryWrapper").html('');
			$("#checkoutPayment").html('');
		},

		// List Invoices
		checkInvoiceSubmitParams : function() {
			if (document.getElementById("Open").checked == false
					&& document.getElementById("Closed").checked == false) {
				alert("Sorry, at least one of the checkboxes need to be selected");
				return false;
			}
			return true;
		},


		// Submit Invoice IDs for Payment
		submitMultipleInvoicePayment: function() {
			var invs = document.getElementsByName("InvoiceIDs[]");
			var inv_count = 0;
			var inv_checked = false;
			var inv_ids = "";

			// payment reference is 50 chars long, so restrict the amount of invoices you can pay.
			var max_invoice_amount = 0;

			for (inv_count=0; inv_count<invs.length; inv_count++) {
					if(invs[inv_count].checked) {
						inv_checked = true;
						if(inv_ids != "") {
							inv_ids = "|" + inv_ids;
						}
						inv_ids = invs[inv_count].value + inv_ids;

						// check that the ref is over 40 chars
						if (inv_ids.length >= 49 && max_invoice_amount == 0) {
							max_invoice_amount = inv_count;
						}
					}
			}

			if(inv_ids == "") {
					alert("Sorry, at least one of the invoice checkboxes needs to be selected");
					return false;
			}
			else if(max_invoice_amount != 0) {
					alert("Sorry, please select a maximum of " + max_invoice_amount + " invoices to pay.");
					return false;
			}
			else {
					var url_redir = document.getElementById("multipleInvoiceRedirect").href;
					document.getElementById("multipleInvoiceRedirect").href = url_redir.replace("~INVIDS~", inv_ids);

					var url_redir2 = document.getElementById("multipleInvoiceRedirect2").href;
					document.getElementById("multipleInvoiceRedirect2").href = url_redir2.replace("~INVIDS~", inv_ids);

					return true;
			}
		}

		//END


	};
}();