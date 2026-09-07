const mongoose = require("mongoose");

const appealSchema = new mongoose.Schema(
{
  ownerName: {
    type: String,
    required: true
  },

  ward: {
    type: String
  },

  propertyNo: {
    type: String
  },

  previousTax: {
    type: Number
  },

  revisedTax: {
    type: Number
  },

  appealReason: {
    type: String
  },

  latitude: {
    type: Number
  },

  longitude: {
    type: Number
  },

location: {
  type: {
    type: String,
    enum: ["Point"]
  },
  coordinates: {
    type: [Number]
  }
},

// Raw GeoJSON polygon/multipolygon geometry sent from the frontend form.
// Without this field, Mongoose's default strict-schema mode silently
// strips req.body.geometry before saving, even though the route handler
// sets it — which is why polygons were never persisted for appeals.
geometry: {
  type: Object,
  default: undefined
},

centroid: {
  type: [Number]
    },

  style: {
    color: String,
    opacity: Number,
    markerType: String
  },

  kmlFileId: {
    type: String
  },

  kmlUrl: {
    type: String
  }

},
{ timestamps: true }
);

appealSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Appeal", appealSchema);