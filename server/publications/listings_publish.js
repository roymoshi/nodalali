import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

//Main - Shop
Meteor.publish('shopMain', function(setlimit) {
  check(setlimit, Match.Integer);
  return Products.find({
    listingsCount: { $gt: 0 },
  },{
    sort: {
      productOffersCount: -1,
      year: -1,
      listingsCount: -1,
      name: 1
    },
    fields: {
      productSoldCount: false,
      launched: false
    },
    limit: setlimit
  });
})

// Listings Index
Meteor.publishComposite('listingIndex', function(productId, options) {
  check(productId, String);
  check(options, {
    loaded: Number,
    skip: Number
  });
  return{
    find: function() {
      return Listings.find({
        productID: productId,
        active: true
      },{
        sort: { postDate: -1 },
        skip: options.skip,
        limit: options.loaded,
        fields: {
          _id: true,
          title: true,
          condition: true,
          productID: true,
          active: true,
          sold: true,
          sellPrice: true,
          postDate: true,
          images: true,
          listedBy: true
        }
      });
    },
    children: [{
      find: function(listing) {
        return Offers.find({
          listingID: listing._id
        },{
          fields: {
            buyer: false,
            offerBy: false
          },
          sort: {
            offerAmount: -1,
            offerDate: 1
          },
          limit: 1
        });
      }
    },{
      find: function(listing) {
        return Uploads.collection.find({ 'meta.listID': listing._id },{
          fields: {
            name: false,
            extension: false,
            path: false,
            type: false,
            size: false,
            versions: false,
            isVideo: false,
            isAudio: false,
            isImage: false,
            isText: false,
            isJSON: false,
            isPDF: false,
            _storagePath: false,
            public: false
          },
          limit: 1
        });
      }
    }]
  }
});

//Main - Offers
Meteor.publishComposite('myOfferIndex', function(options) {
  check(options, {
    loaded: Number,
    skip: Number
  });
  return {
    find: function() {
      return Offers.find({
        offerBy: this.userId
      },{
        sort: { offerDate: -1 },
        skip: options.skip,
        limit: options.loaded
      });
    },
    children: [{
      find: function(offer) {
        return Listings.find({
          _id: offer.listingID
        },{
          limit: options.loaded,
          fields: {
            _id: true,
            title: true,
            condition: true,
            productID: true,
            active: true,
            sold: true,
            sellPrice: true,
            postDate: true,
            images: true,
            listedBy: true
          }
        });
      },
      children: [{
        find: function(listing, offer) {
          return Offers.find({
            listingID: listing._id
          },{
            fields: {
              buyer: false,
              offerBy: false,
            },
            sort: {
              offerAmount: -1,
              offerDate: 1
            },
            limit: 1
          });
        },
      },{
        find: function(listing) {
          return Uploads.collection.find({ 'meta.listID': listing._id },{
              fields: {
                name: false,
                extension: false,
                path: false,
                type: false,
                size: false,
                versions: false,
                isVideo: false,
                isAudio: false,
                isImage: false,
                isText: false,
                isJSON: false,
                isPDF: false,
                _storagePath: false,
                public: false
              },
              limit: 1
            });
        }
      }]
    }]
  }
});
//Main - Sell
Meteor.publishComposite('myPosts', function(options) {
  check(options, {
    loaded: Number,
    skip: Number
  });
  return{
    find: function() {
      return Listings.find({
        listedBy: this.userId,
        active: true
      },{
        sort: { postDate: -1 },
        skip: options.skip,
        limit: options.loaded,
        fields: {
          _id: true,
          title: true,
          views: true,
          condition: true,
          productID: true,
          active: true,
          sold: true,
          sellPrice: true,
          postDate: true,
          images: true,
          listedBy: true
        }
      });
    },
    children: [{
      find: function(listing) {
        return Offers.find({
          listingID: listing._id
        },{
          fields: {
            buyer: false,
            offerBy: false
          },
          sort: {
            offerAmount: -1,
            offerDate: 1
          },
          limit: 1
        });
      }
    },{
      find: function(listing) {
        return Uploads.collection.find({ 'meta.listID': listing._id },{
            fields: {
              name: false,
              extension: false,
              path: false,
              type: false,
              size: false,
              versions: false,
              isVideo: false,
              isAudio: false,
              isImage: false,
              isText: false,
              isJSON: false,
              isPDF: false,
              _storagePath: false,
              public: false
            },
            limit: 1
          });
      }
    }]
  }
});

Meteor.publish('selectModel', function(setlimit) {
  check(setlimit, Match.Integer);
  return Products.find({},{
    sort: {
      productOffersCount: -1,
      year: -1,
      listingsCount: -1,
      name: 1
    },
    fields: {
      productSoldCount: false,
      launched: false,
      category: false
    },
    limit: setlimit
  });
});

Meteor.publish('searchListing', function(id) {
  check(id, String);
  return [
    Listings.find({
      _id: id,
      active: true
    },{
      sort: { postDate: -1 },
      limit: 1,
      fields: {
        _id: true,
        title: true,
        condition: true,
        productID: true,
        active: true,
        sold: true,
        sellPrice: true,
        postDate: true,
        images: true,
        listedBy: true
      }
    }),
    Uploads.collection.find({ 'meta.listID': id },{
        fields: {
          name: false,
          extension: false,
          path: false,
          type: false,
          size: false,
          versions: false,
          isVideo: false,
          isAudio: false,
          isImage: false,
          isText: false,
          isJSON: false,
          isPDF: false,
          _storagePath: false,
          public: false
        },
        limit: 1
      })
  ]
});
