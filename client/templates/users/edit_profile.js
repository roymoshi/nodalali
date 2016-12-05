import { _meteorAngular } from 'meteor/angular';
import { Meteor } from 'meteor/meteor';

angular
    .module('salephone')
    .controller('EditProfCtrl', EditProfCtrl);

function EditProfCtrl (
                        $scope,
                        $reactive,
                        $timeout,
                        $cordovaToast,
                        $state,
                        $http,
                        $ionicPopup,
                        $ionicModal,
                        $rootScope,
                        $ionicLoading,
                        $cordovaDevice,
                        $cordovaImagePicker,
                        $cordovaFile
                      ) {

  $reactive(this).attach($scope);
  $scope.mylocation = null;
  var self = this;

  this.subscribe('myProfile', () => [], {
    onReady: function() {
      $ionicLoading.hide();
      return;
    }
  });

  //Detect changes on user's country and update selection for user locaiton.
  this.autorun( () => {
    if ( self.getReactively('profile.location.countryCode') ) {
      $rootScope.$broadcast('loadspinner');
      //Method is located at tapshop/server/methods/server_methods.js
      Meteor.call( 'getRegion', self.profile.location.countryCode, function(err, result) {
        if (!err) {
          self.regionlist = result.sort();
          self.currentRegion = self.profile.location.region;
          $ionicLoading.hide();
        }
        else {
          $ionicLoading.hide();
          return;
        }
      });
    }
  });

  //Check if user has password, or has logged-in using Oauth.
  //Method is located at tapshop/server/methods/profile_server.js
  Meteor.call('hasPassword', function(err, result){
    if ( !err && result === true ){
      $scope.hasPassword = true;
    }
    else {
      $scope.hasPassword = false;
    }
  });

  //Variables for image upload.
  this.upload = null;
  this.preview = null;
  this.imgremove = null;
  this.disabled = false;

  this.helpers({
    profile: () => Profile.findOne({ profID: Meteor.userId() }),
    profileImg: () => ProfileImg.findOne({ 'meta.userId': Meteor.userId() }),
    cityList: () => LocationDB.find({
        region: self.getReactively('profile.location.region'),
        countryCode: self.getReactively('profile.location.countryCode')
      },{
        sort: { city: 1 }
    }),
    email: () => Meteor.user().emails[0].address,
    hasUpload() {
      if ( self.getReactively('profileImg') && !self.getReactively('imgremove') ) {
        return true;
      }
      else {
        return false;
      }
    }
  });

  if ( Meteor.isCordova && $cordovaDevice.getPlatform() === "Android" && $cordovaDevice.getVersion().indexOf("4.4") === 0 ) {
    self.isAndroid4 = true;
    //Save uploaded image on Android 4.4.
    this.addFile = function() {
      $rootScope.$broadcast('loadspinner');
      let options = {
        maximumImagesCount: 1,
        width: 80,
        height: 80,
        quality: 70
      };
      $cordovaImagePicker.getPictures(options)
        .then(function (files) {
          if ( files[0] ) {
            let file = files[0].substring( files[0].indexOf("cache/") + 6 )
            $cordovaFile.readAsDataURL(cordova.file.cacheDirectory, file)
              .then( function(result){
                self.preview = result;
                self.upload = MeteorCameraUI.dataURIToBlob(result);
                $ionicLoading.hide();
                return;
              },
              function(error){
                $cordovaToast.showLongBottom('Error. Please try again.');
                $ionicLoading.hide();
                return;
              });
          }
          else {
            $ionicLoading.hide();
            return;
          }
        },
        function(error) {
          $cordovaToast.showLongBottom('Error. Please try again.');
          $ionicLoading.hide();
          return;
        });
    }
  }
  else {
    self.isAndroid4 = false;
  }

  //Save uploaded image.
  this.uploadImg = function(files) {
    if ( files.length != 0 ) {
      $rootScope.$broadcast('loadspinner');
      let imgUrl = window.URL.createObjectURL(files[0]);

      this.resizeImage(imgUrl, function(result){
        self.preview = result;
        self.upload = MeteorCameraUI.dataURIToBlob(result);
        $ionicLoading.hide();
      });
    }
  };


  //Remove current profile image.
  this.removeImg = function() {
    if ( this.upload != null ) {
      this.upload = null;
      this.preview = null;
      return;
    }
    else if ( self.profileImg && this.imgremove === null ) {
      this.imgremove = self.profileImg._id;
      this.preview = "/images/users/profile_default.png";
      return;
    }
  };

  //Get location data of user using Geolocaiton.
  this.getLocation = function() {
    $rootScope.$broadcast('loadspinner');
    let geodata = Geolocation.latLng();

    if ( geodata === null ) {
      if (Meteor.isCordova) {
        $cordovaToast.showLongBottom('Error. Please enable GPS.');
      } else {
        toastr.error('Error. Please enable GPS.');
      }
      $ionicLoading.hide();
      return;
    }
    else if ( geodata != null ) {
      //Method is located at tapshop/server/methods/server_methods.js
      Meteor.call('getLocation', geodata, function(err, geoloc) {
        if ( !err ) {
          self.profile.location.city = geoloc.city;
          self.profile.location.region = geoloc.region;
          self.profile.location.country = geoloc.country;
          if ( self.profile.location.countryCode !== geoloc.countryCode ) {
            self.subscribe('getLocation', () => [ geoloc.countryCode ], {
              onReady: function() {
                self.profile.location.countryCode = geoloc.countryCode;
                $ionicLoading.hide();
              }
            })
          }
          if ( !geoloc.city || !geoloc.region ) {
            if (Meteor.isCordova) {
              $cordovaToast.showLongBottom('Error. Please try again.');
            } else {
              toastr.error('Error. Please try again.');
            }
            $ionicLoading.hide();
          }
          else {
            if (Meteor.isCordova) {
              $cordovaToast.showShortBottom('Location Updated');
            } else {
              toastr.success('Location Updated');
            }
            $ionicLoading.hide();
          }
        }
        else {
          console.log( "Error getting geolocation, please try again later." );
          if (Meteor.isCordova) {
            $cordovaToast.showLongBottom('Error. Please try again.');
          } else {
            toastr.error('Error. Please try again.');
          }
          $ionicLoading.hide();
          return null;
        }
      });
    };
  };

  //Modal for selecting Region of user.
  $ionicModal.fromTemplateUrl('client/templates/users/region_modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.region = modal;
  });

  //Modal for selecting City of user.
  $ionicModal.fromTemplateUrl('client/templates/users/city_modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.area = modal;
    if ( self.regionlist ) {
      $scope.region.show();
    }
  });

  //Show modal of Region selection.
  this.selectLocation = function() {
    if ( self.regionlist ) {
      $scope.region.show();
    }
  };

  //Select a Region, and load Cities on that Region.
  this.selectRegion = function() {
    $rootScope.$broadcast('loadspinner');
    if ( !self.profile.location.region ) {
      if (Meteor.isCordova) {
        $cordovaToast.showLongBottom('Please select region.');
      } else {
        toastr.error('Please select region.');
      }
      $scope.region.hide();
      $ionicLoading.hide();
    }
    else {
      if ( self.currentRegion != self.profile.location.region ){
        self.profile.location.city = '';
        self.currentRegion = self.profile.location.region
      }
      $scope.area.show();
      $scope.region.hide();
      $ionicLoading.hide();
    }
  };

  //Select a city and hide the modal.
  this.selectArea = function() {
    $scope.area.hide();
  };

  $scope.noName = false;

  //Save profile changes in database.
  this.update = function() {
    if ( !self.profile.profName ) {
      $scope.noName = true;
      console.log("Please fill-up username.");
      if (Meteor.isCordova) {
        $cordovaToast.showLongBottom('Username is required.');
      } else {
        toastr.error('Username is required.');
      }
      return;
    }
    else {
      $scope.noName = false;
      $rootScope.$broadcast('loadspinner');
      let profile = self.profile;

      if ( this.imgremove !== null ) {
        //Method is located at tapshop/lib/methods/profile.js
        Meteor.call('removeImage', this.imgremove, function(err) {
          if (err) {
            console.log('Error removing image.');
            if (Meteor.isCordova) {
              $cordovaToast.showLongBottom('Error. Please try again.');
            } else {
              toastr.error('Error. Please try again.');
            }
            $ionicLoading.hide();
            return;
          }
        });
      }

      //Save and upload changes to user profile.
      //Method is located at tapshop/server/methods/profile_server.js
      Meteor.call('checkName', self.profile.profName, function(err, result){
        if ( !err && result === true ) {
          let newProfile = {
              username: self.profile.profName,
              city: self.profile.location.city,
              region: self.profile.location.region,
              country: self.profile.location.country,
              countryCode: self.profile.location.countryCode,
          }
          //Method is located at tapshop/server/methods/profile_server.js
          Meteor.call('updateProfile', Meteor.userId(), newProfile, function(err) {
            if (!err) {
              if ( self.upload !== null ) {
                let uploadFile = self.newFile(self.upload);

                if ( self.profileImg ) {
                  //Remove profile image selected for removal from database.
                  //Method is located at tapshop/lib/methods/profile.js
                  Meteor.call('removeImage', self.profileImg._id, function(err) {
                    if (!err) {
                      var uploadInstance = ProfileImg.insert({
                        file: uploadFile,
                        streams: 'dynamic',
                        chunkSize: 'dynamic'
                      }, false);

                      uploadInstance.on('end', function(error, fileObj) {
                        if (!error) {
                          //Method is located at tapshop/lib/methods/profile.js
                          Meteor.call('updateProfImg', fileObj._id, function(err){
                            if(!err){
                              $scope.area.remove();
                              $scope.region.remove();
                              if (Meteor.isCordova) {
                                $cordovaToast.showShortBottom('Profile Updated');
                              } else {
                                toastr.success('Profile Updated');
                              }
                              $state.go('app.myprofile');
                            }
                            else {
                              console.log(err);
                              if (Meteor.isCordova) {
                                $cordovaToast.showLongBottom('Error. Please try again.');
                              } else {
                                toastr.error('Error. Please try again.');
                              }
                              $ionicLoading.hide();
                              return;
                            }
                          });
                        }
                        else {
                          console.log(err);
                          if (Meteor.isCordova) {
                            $cordovaToast.showLongBottom('Error. Please try again.');
                          } else {
                            toastr.error('Error. Please try again.');
                          }
                          $ionicLoading.hide();
                          return;
                        }
                      });
                      uploadInstance.start();
                    }
                    else {
                      if (Meteor.isCordova) {
                        $cordovaToast.showLongBottom('Error. Please try again.');
                      } else {
                        toastr.error('Error. Please try again.');
                      }
                      $ionicLoading.hide();
                      return;
                    }
                  });
                }
                else {
                  //Upload new image to database.
                  var uploadInstance = ProfileImg.insert({
                    file: uploadFile,
                    streams: 'dynamic',
                    chunkSize: 'dynamic'
                  }, false);

                  uploadInstance.on('end', function(error, fileObj) {
                    if (!error) {
                      //Method is located at tapshop/lib/methods/profile.js
                      Meteor.call('updateProfImg', fileObj._id, function(err){
                        if(!err){
                          $scope.area.remove();
                          $scope.region.remove();
                          if (Meteor.isCordova) {
                            $cordovaToast.showShortBottom('Profile Updated');
                          } else {
                            toastr.success('Profile Updated');
                          }
                          $state.go('app.myprofile');
                        }
                        else {
                          console.log(err);
                          if (Meteor.isCordova) {
                            $cordovaToast.showLongBottom('Error. Please try again.');
                          } else {
                            toastr.error('Error. Please try again.');
                          }
                          $ionicLoading.hide();
                          return;
                        }
                      });
                    }
                    else {
                      console.log(err);
                      if (Meteor.isCordova) {
                        $cordovaToast.showLongBottom('Error. Please try again.');
                      } else {
                        toastr.error('Error. Please try again.');
                      }
                      $ionicLoading.hide();
                      return;
                    }
                  });
                  uploadInstance.start();
                }
              }
              else {
                $scope.area.remove();
                $scope.region.remove();
                if (Meteor.isCordova) {
                  $cordovaToast.showShortBottom('Profile Updated');
                } else {
                  toastr.success('Profile Updated');
                }
                $state.go('app.myprofile');
              }
            }
            else {
              console.log("Update error, please try again.");
              if (Meteor.isCordova) {
                $cordovaToast.showLongBottom('Error. Please try again.');
              } else {
                toastr.error('Error. Please try again.');
              }
              $ionicLoading.hide();
              return;
            }
          })
        }
        else if ( result === false ){
          $scope.noName = true;
          if (Meteor.isCordova) {
            $cordovaToast.showLongBottom('New username already exists.');
          } else {
            toastr.error('New username already exists.');
          }
          $ionicLoading.hide();
        }
        else {
          if (Meteor.isCordova) {
            $cordovaToast.showLongBottom('Error. Please try again.');
          } else {
            toastr.error('Error. Please try again.');
          }
          $ionicLoading.hide();
        }
      });
    }
  };

  //Logout the user.
  this.logout = function() {
      $rootScope.$broadcast('loadspinner');
      Meteor.logout(function(err) {
          if (!err) {
              Meteor.logoutOtherClients();
              $ionicLoading.hide();
              $state.go('app.shop');
          } else {
              $ionicLoading.hide();
              if (Meteor.isCordova) {
                $cordovaToast.showLongBottom('Error. Please try again.');
              } else {
                toastr.error('Error. Please try again.');
              }
              return
          }
      });
  };
  this.resizeImage = function(url, callback){
    var sourceImage = new Image();

    sourceImage.onload = function() {
       var canvas = document.createElement("canvas");
       canvas.width = 80;
       canvas.height = 80;
       canvas.class = "edit-profileimg";
       canvas.getContext("2d").drawImage(sourceImage, 0, 0, 80, 80);
       callback(canvas.toDataURL());
    }
   sourceImage.src = url;
  }

  this.newFile = function(blob){
    let filename = self.profile.profName + '.png';
    let newFile = _.extend(blob,{
      name: filename
    })
    return newFile;
  }

  $scope.$on('$ionicView.beforeLeave', function () {
    this.upload = null;
    this.preview = null;
    this.imgremove = null;
    $scope.area.remove();
    $scope.region.remove();
  });

  $scope.$on('$ionicView.afterEnter', function (event, viewData) {
    if ( document.getElementById("content-main") !== null ) {
      $ionicLoading.hide();
    }
  });
};
