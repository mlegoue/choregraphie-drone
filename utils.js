export function findPosition(clocktime, json_waypoints){
    let p_x, p_y, p_z;

    for(let i = 0; i < json_waypoints.length - 1; i++){
        if(i === 0 && json_waypoints[i].frame/30 > clocktime){
            p_x = parseFloat(json_waypoints[i].position.lng_X)/100;
            p_y = parseFloat(json_waypoints[i].position.alt_Y)/100;
            p_z = parseFloat(json_waypoints[i].position.lat_Z)/100;
        } else if (json_waypoints[i].frame/30 === clocktime){
            p_x = parseFloat(json_waypoints[i].position.lng_X)/100;
            p_y = parseFloat(json_waypoints[i].position.alt_Y)/100;
            p_z = parseFloat(json_waypoints[i].position.lat_Z)/100;
        } else if(json_waypoints[i].frame/30 < clocktime && json_waypoints[i+1].frame/30 > clocktime){
            let x_i = parseFloat(json_waypoints[i].position.lng_X)/100;
            let y_i = parseFloat(json_waypoints[i].position.alt_Y)/100;
            let z_i = parseFloat(json_waypoints[i].position.lat_Z)/100;

            let x_j = parseFloat(json_waypoints[i+1].position.lng_X)/100;
            let y_j = parseFloat(json_waypoints[i+1].position.alt_Y)/100;
            let z_j = parseFloat(json_waypoints[i+1].position.lat_Z)/100;

            let a_x = (x_j - x_i)/(json_waypoints[i+1].frame/30 - json_waypoints[i].frame/30);
            let a_y = (y_j - y_i)/(json_waypoints[i+1].frame/30 - json_waypoints[i].frame/30);
            let a_z = (z_j - z_i)/(json_waypoints[i+1].frame/30 - json_waypoints[i].frame/30);

            p_x = x_i + a_x*(clocktime - json_waypoints[i].frame/30);
            p_y = y_i + a_y*(clocktime - json_waypoints[i].frame/30);
            p_z = z_i + a_z*(clocktime - json_waypoints[i].frame/30);
        } else if (i === json_waypoints.length - 2 && json_waypoints[i+1].frame/30 < clocktime) {
            p_x = parseFloat(json_waypoints[i+1].position.lng_X)/100;
            p_y = parseFloat(json_waypoints[i+1].position.alt_Y)/100;
            p_z = parseFloat(json_waypoints[i+1].position.lat_Z)/100;
        }
    }

    return {p_x, p_y, p_z}
}

