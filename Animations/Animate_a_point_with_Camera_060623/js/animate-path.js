import { computeCameraPosition } from "./util.js";
import { updateInsetMap } from "./scripts.js";
import { add_Snow_Source } from "./scripts.js";
import { add_Snow_Layer } from "./scripts.js";
const animatePath = async ({
  map,
  inset,
  duration,
  path,
  startBearing,
  startAltitude,
  pitch,
  prod
}) => {
  return new Promise(async (resolve) => {
    const pathDistance = turf.lineDistance(path);
    let startTime;

    // here start calculate the time
    let startDate = new Date(path.properties.start_date);
    let endDate = new Date(path.properties.end_date);
    let time_difference = endDate.getTime() - startDate.getTime();
    let day_difference = time_difference / (1000 * 3600 * 24 );
    let maxFrame = duration;
    console.log(day_difference);
    var real_time, new_day, month_day, month, day, month_str, day_str;
    var new_day_format, source_day_format, source_month, source_month_day;
    var source_month_str, source_day_str, source_day, month_day, mod_day;
    var current_day = 0;
    let previous_month_day = "0415";

    const frame = async (currentTime) => {
      if (!startTime) startTime = currentTime;
      const animationPhase = (currentTime - startTime) / duration;

      // when the duration is complete, resolve the promise and stop iterating
      if (animationPhase > 1) {

        resolve();
        return;
      }

      // calculate the distance along the path based on the animationPhase
      const alongPath = turf.along(path, pathDistance * animationPhase).geometry
        .coordinates;

      const lngLat = {
        lng: alongPath[0],
        lat: alongPath[1],
      };

      // Reduce the visible length of the line by using a line-gradient to cutoff the line
      // animationPhase is a value between 0 and 1 that reprents the progress of the animation
      map.setPaintProperty(
        "line-layer",
        "line-gradient",
        [
          "step",
          ["line-progress"],
          "yellow",
          animationPhase,
          "rgba(0, 0, 0, 0)",
       ]
      );

      // slowly rotate the map at a constant rate
      const bearing = 0//startBearing - animationPhase * 200.0; // removed slow rotation by setting bearing to 0 (IGL)

      // compute corrected camera ground position, so that he leading edge of the path is in view
      var correctedPosition = computeCameraPosition(
        pitch,
        bearing,
        lngLat,
        startAltitude,
        true // smooth
      );

      // set the pitch and bearing of the camera
      const camera = map.getFreeCameraOptions();
      camera.setPitchBearing(pitch, bearing);

      // set the position and altitude of the camera
      camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
        correctedPosition,
        startAltitude
      );
      // apply the new camera options
      map.setFreeCameraOptions(camera);

      // update inset map dot location
      updateInsetMap(lngLat);

      //Interval Bar and Snow Layers
      //Real time returns to zero after reset
      real_time = currentTime;
      //Declare the Bar variables
      var bar_interval = 0;
      if (bar_interval == 0) {
        bar_interval = 1;
        var elem = document.getElementById("myBar");
        var width = 1;
        var id = setInterval(frame, 10);
                  
        //Here start measuring the dates
        function frame() {
          if (width >= 100) {
            clearInterval(id);
            bar_interval = 0;
          } else {
            // Width is the width of the White Bar. It is dynamic
            width = (real_time / maxFrame) * 100;
            elem.style.width = width + "%";
            // New Day is an int for the number of days after the start date of the dataset
            new_day = Math.round(( width / 100 ) * day_difference);
            // New Day Format is the current time in Date format
            new_day_format = new Date(startDate.getTime() + ((24 * 60 * 60 * 1000) * new_day));
            source_day_format = new Date(startDate.getTime() + ((24 * 60 * 60 * 1000) * (new_day + 4))); //Loading sources of X day(s) in advance
            // Show the current time on the Bar
            elem.innerHTML = new_day_format.toLocaleDateString();
            // Grab the month and day of the current time
            month = new_day_format.toLocaleString('default', { month: 'numeric' });
            day = new_day_format.toLocaleString('default', { day: 'numeric' });
            source_month = source_day_format.toLocaleString('default', { month: 'numeric' });
            source_day = source_day_format.toLocaleString('default', { day: 'numeric' });
            mod_day = (day % 3); // Mod to control the frequency of updating snow layers
            // Change the formats of month and day to match the naming practices of snow layers
            if (month < 10){
              month_str = "0" + month.toString();
            } else {
              month_str = month.toString();
            }
            if (day < 10){
              day_str = "0" + day.toString();
            } else {
              day_str = day.toString();
            }
            if (source_month < 10){
              source_month_str = "0" + source_month.toString();
            } else {
              source_month_str = source_month.toString();
            }
            if (source_day < 10){
              source_day_str = "0" + source_day.toString();
            } else {
              source_day_str = source_day.toString();
            }
            // Here start the Snow Layer Animation
            // Update Future Layer for the first loop
            source_month_day = source_month_str + source_day_str;
            if (map.getSource('Snow_' + source_month_day) == undefined){
              add_Snow_Source(source_month_day);
              console.log(source_month_day + ' Source added');
            }
            if ((new_day > current_day || new_day < current_day) && mod_day == 0){
              previous_month_day = month_day;
              source_month_day = source_month_str + source_day_str;
              month_day = month_str + day_str;
              // previous_month_day = previous_month_str + previous_day_str;
              current_day = new_day;
              // Update Snow Layer for the first loop
              if (map.getSource('Snow_' + month_day) != undefined){
                map.removeLayer('Snow_layer_' + previous_month_day);
                add_Snow_Layer(month_day);
                console.log(previous_month_day + ' Previous snow layer removed');
                console.log(month_day + ' Layer added');
              }
            }
          }
        }
      }
      // repeat!
      await window.requestAnimationFrame(frame);
    };

    await window.requestAnimationFrame(frame);
  });
};

export default animatePath;
