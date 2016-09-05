var bg = undefined;

(function() {
  var ui = {
    picker: null,
    r: null,
    g: null,
    b: null
  };


  function initializeWindow() {
    for (var k in ui) {
      var id = k.replace(/([A-Z])/, '-$1').toLowerCase();
      var element = document.getElementById(id);
      if (!element) {
        throw "Missing UI element: " + k;
      }
      ui[k] = element;
    }
    setGradients();
    ui.picker.addEventListener('change', onSelectionChanged);
    ui.r.addEventListener('input', onColorChanged);
    ui.g.addEventListener('input', onColorChanged);
    ui.b.addEventListener('input', onColorChanged);

    chrome.hid.getDevices({}, onDevicesEnumerated);
    if (chrome.hid.onDeviceAdded) {
      chrome.hid.onDeviceAdded.addListener(onDeviceAdded);
    }
    if (chrome.hid.onDeviceRemoved) {
      chrome.hid.onDeviceRemoved.addListener(onDeviceRemoved);
    }
  };

  function enableControls(enabled) {
    ui.r.disabled = !enabled;
    ui.g.disabled = !enabled;
    ui.b.disabled = !enabled;
  };

  function onDevicesEnumerated(devices) {
    if (chrome.runtime.lastError) {
      console.error("Unable to enumerate devices: " +
                    chrome.runtime.lastError.message);
      return;
    }

    for (var device of devices) {
      onDeviceAdded(device);
    }
  }

  function onDeviceAdded(device) {
    if (device.vendorId != Blink1.VENDOR_ID ||
        device.productId != Blink1.PRODUCT_ID) {
      return;
    }

    var blink1 = new Blink1(device.deviceId);
    blink1.connect(function (success) {
      if (success) {
        blink1.getVersion(function (version) {
          if (version) {
            blink1.version = version;
            addNewDevice(blink1);
          }
        });
      }
    });
  }

  function onDeviceRemoved(deviceId) {
    var option = ui.picker.options.namedItem('device-' + deviceId);
    if (!option) {
      return;
    }

    if (option.selected) {
      bg.blink1.disconnect(function() {});
      bg.blink1 = undefined;
      enableControls(false);
      if (option.previousSibling) {
        option.previousSibling.selected = true;
      }
      if (option.nextSibling) {
        option.nextSibling.selected = true;
      }
    }
    ui.picker.remove(option.index);
    if (ui.picker.options.length == 0) {
      var empty = document.createElement('option');
      empty.text = 'No devices found.';
      empty.id = 'empty';
      empty.selected = true;
      ui.picker.add(empty);
      ui.picker.disabled = true;
    } else {
      switchToDevice(ui.picker.selectedIndex);
    }
  }

  function addNewDevice(blink1) {
    var firstDevice = ui.picker.options[0].id == 'empty';
    var option = document.createElement('option');
    option.text = blink1.deviceId + ' (version ' + blink1.version + ')';
    option.id = 'device-' + blink1.deviceId;
    ui.picker.add(option);
    ui.picker.disabled = false;
    if (firstDevice) {
      ui.picker.remove(0);
      option.selected = true;
      setActiveDevice(blink1);
    } else {
      blink1.disconnect(function () {});
    }
  }

  function setActiveDevice(blink1) {
    bg.blink1 = blink1;
    bg.blink1.getRgb(0, function(r, g, b) {
      ui.r.value = r || 0;
      ui.g.value = g || 0;
      ui.b.value = b || 0;
      setGradients();
    });
    enableControls(true);
  }

  function switchToDevice(optionIndex) {
    var deviceId =
        parseInt(ui.picker.options[optionIndex].id.substring(7));
    var blink1 = new Blink1(deviceId);
    blink1.connect(function (success) {
      if (success) {
        setActiveDevice(blink1);
      }
    });
  }

  function onSelectionChanged() {
    bg.blink1.disconnect(function() {});
    bg.blink1 = undefined;
    enableControls(false);
    switchToDevice(ui.picker.selectedIndex);
  }

  function onColorChanged() {
    setGradients();
    bg.blink1.fadeRgb(ui.r.value, ui.g.value, ui.b.value, 250, 0);
  }

  function setGradients() {
    var r = ui.r.value, g = ui.g.value, b = ui.b.value;
    ui.r.style.background =
       'linear-gradient(to right, rgb(0, ' + g + ', ' + b + '), ' +
                                 'rgb(255, ' + g + ', ' + b + '))';
    ui.g.style.background =
       'linear-gradient(to right, rgb(' + r + ', 0, ' + b + '), ' +
                                 'rgb(' + r + ', 255, ' + b + '))';
    ui.b.style.background =
       'linear-gradient(to right, rgb(' + r + ', ' + g + ', 0), ' +
                                 'rgb(' + r + ', ' + g + ', 255))';
  }

  window.addEventListener('load', function() {
    // Once the background page has been loaded, it will not unload until this
    // window is closed.
    chrome.runtime.getBackgroundPage(function(backgroundPage) {
      bg = backgroundPage;
      initializeWindow();
    });
  });
}());

function updateCanInterruptStatusBatch()
{
    var usernames = [];

    $(".circle-status").each(function (index) {
        usernames.push($(this).data("username"));
    });

    if (usernames.length > 0) {
        $.unique(usernames);

        updateCanInterruptUserStatus(usernames);
    }

    return usernames.length;
}

function updateCanInterruptUserStatus(usernames) {
    $(".circle-status").addClass("grey");

    $.ajax({
        type: 'POST',
        url: 'https://codealike.com/api/v2/public/CanInterruptUser',
        data: JSON.stringify({ UserNames: usernames }),
        dataType: 'json',
        contentType: 'application/json'
    })
    .done(function (success) {
        for (var i = 0; i < success.length; i++) {
            var username = success[i].m_Item1.replace(/\./g, "");
            var result = success[i].m_Item2;

            defineInterruptionStatusUI(username, result);
        }
    });
};

function defineInterruptionStatusUI(username, result)
{
    $(".circle_" + username).removeClass("grey");
    $(".circle_" + username).removeClass("red");
    $(".circle_" + username).removeClass("darkGreen");

    if (result == "NoActivity") {
        $(".circle_" + username).addClass("grey");

        if ($("#statement")) {
            $("#statement").html("Yes!");
        }
        if ($("#explanation")) {
            $("#explanation").html("It seems that there's no recent coding activity. <br/> Nevertheless, this user might be working on something else.");
        }
    }
    else if (result == "CannotInterrupt") {
        $(".circle_" + username).addClass("red");

        bg.blink1.fadeRgb(164, 3, 0, 250, 0);

        if ($("#statement")) {
            $("#statement").html("PLEASE, DON'T!");
        }
        if ($("#explanation")) {
            $("#explanation").html("<h3>Please, think twice before interrupting this user. <h3/> Interruptions are very expensive for developers, teams and organizations. <br/> Can you wait a bunch of minutes and check this again? Please? Thanks! :-D");
        }
    }
    else {
        $(".circle_" + username).addClass("darkGreen");

        bg.blink1.fadeRgb(0, 159, 0, 250, 0);

        if ($("#statement")) {
            $("#statement").html("Maybe");
        }
        if ($("#explanation")) {
            $("#explanation").html("Even though, this user is coding, it seems that it's not on a coding streak. <br/> Be careful, but we believe you won't get bitten if you interrupt :-D");
        }
    }
}