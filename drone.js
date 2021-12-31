export class Drone {
    constructor(object, json){
        this.id = json.id;
        this.positions = json.waypoints;
        this.x = parseFloat(this.positions[0].position.lng_X)/100;
        this.y = parseFloat(this.positions[0].position.alt_Y)/100;
        this.z = parseFloat(this.positions[0].position.lat_Z)/100;
        this.speed = 0;

        const sphereGeometry = new THREE.SphereGeometry( 2, 32, 16 );
        const sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00, transparent: true, opacity: 0.2 } );
        const sphere = new THREE.Mesh( sphereGeometry, sphereMaterial );

        this.sphere = new THREE.Sphere(new THREE.Vector3(this.x, this.y, this.z), 2);
        this.show_sphere = sphere;
        this.show_sphere.position.set(this.x, this.y, this.z);

        this.light = new THREE.PointLight( 0xffffff, // couleur
            0.5, // intensité
            10 ); // distance (0 : pas de limite)
        this.light.position.set( this.x, this.y, this.z);


        // création de l'objet et initialisation de sa position
        this.object = object.clone();
        this.object.position.set(this.x, this.y, this.z);

        // création de la ligne entre le drone et le sol
        const points = [];
        const material = new THREE.LineBasicMaterial({color: 0xff0000});
        points.push( new THREE.Vector3(this.x, this.y, this.z));
        points.push( new THREE.Vector3(this.x, 0, this.z));
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        this.line = new THREE.Line( geometry, material );

        // creation de la trajectoire du drone
        const points_traj = [];
        const material_traj = new THREE.LineBasicMaterial({color: 0x0000ff});
        for(let i = 0; i < this.positions.length; i++) {
            points_traj.push( new THREE.Vector3(
                parseFloat(this.positions[i].position.lng_X)/100,
                parseFloat(this.positions[i].position.alt_Y)/100,
                parseFloat(this.positions[i].position.lat_Z)/100
            ));
        }
        const geometry_traj = new THREE.BufferGeometry().setFromPoints( points_traj );
        this.traj = new THREE.Line( geometry_traj, material_traj );

        //creation du label

        const droneDiv = document.createElement( 'div' );
        droneDiv.className = 'label';
        droneDiv.textContent = this.id;
        droneDiv.style.marginTop = '-0.5em';
        this.label = new THREE.CSS2DObject( droneDiv );
        this.label.position.set(this.x, this.y+0.5, this.z);
    };

    update_position(clocktime, delta){
        let p_x = parseFloat(this.positions[0].position.lng_X)/100;
        let p_y = parseFloat(this.positions[0].position.alt_Y)/100;
        let p_z = parseFloat(this.positions[0].position.lat_Z)/100;
        let finish = false;

        for(let i = 0; i < this.positions.length - 1; i++){
            if (this.positions[i].frame/30 === clocktime){
                p_x = parseFloat(this.positions[i].position.lng_X)/100;
                p_y = parseFloat(this.positions[i].position.alt_Y)/100;
                p_z = parseFloat(this.positions[i].position.lat_Z)/100;
            } else if(this.positions[i].frame/30 < clocktime && this.positions[i+1].frame/30 > clocktime){
                let x_i = parseFloat(this.positions[i].position.lng_X)/100;
                let y_i = parseFloat(this.positions[i].position.alt_Y)/100;
                let z_i = parseFloat(this.positions[i].position.lat_Z)/100;

                let x_j = parseFloat(this.positions[i+1].position.lng_X)/100;
                let y_j = parseFloat(this.positions[i+1].position.alt_Y)/100;
                let z_j = parseFloat(this.positions[i+1].position.lat_Z)/100;

                let a_x = (x_j - x_i)/(this.positions[i+1].frame/30 - this.positions[i].frame/30);
                let a_y = (y_j - y_i)/(this.positions[i+1].frame/30 - this.positions[i].frame/30);
                let a_z = (z_j - z_i)/(this.positions[i+1].frame/30 - this.positions[i].frame/30);

                p_x = x_i + a_x*(clocktime - this.positions[i].frame/30);
                p_y = y_i + a_y*(clocktime - this.positions[i].frame/30);
                p_z = z_i + a_z*(clocktime - this.positions[i].frame/30);
            } else if (i === this.positions.length - 2 && this.positions[i+1].frame/30 < clocktime) {
                p_x = parseFloat(this.positions[i+1].position.lng_X)/100;
                p_y = parseFloat(this.positions[i+1].position.alt_Y)/100;
                p_z = parseFloat(this.positions[i+1].position.lat_Z)/100;
                finish = true;
            }
        }

        let dx_2 = Math.pow(p_x - this.x, 2);
        let dy_2 = Math.pow(p_y - this.y, 2);
        let dz_2 = Math.pow(p_z - this.z, 2);


        if(delta !== 0){
            this.speed = 3.6*Math.sqrt(dx_2 + dy_2 + dz_2)/delta;
        } else {
            this.speed = 0;
        }

        this.x = p_x;
        this.y = p_y;
        this.z = p_z;
        this.object.position.set(this.x, this.y, this.z);
        this.light.position.set(this.x, this.y, this.z);

        return finish

    }

    check_speed(vitesse_max, clocktime){
        if(this.speed > vitesse_max){
            let new_alert = document.createElement('p');
            new_alert.innerHTML = '<b>Temps : ' + clocktime.toFixed(2) + '</b> - Le drone ' + this.id + ' a dépassé la vitesse maximale. (Vitesse atteinte : ' + this.speed.toFixed(2) + ' km/h)'
            let speed_alerts = document.getElementById('speed');
            speed_alerts.append(new_alert);
        }
    }

    update_line(){
        const points = [];
        const material = new THREE.LineBasicMaterial({color: 0xff0000});
        points.push( new THREE.Vector3(this.x, this.y, this.z));
        points.push( new THREE.Vector3(this.x, 0, this.z));
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        this.line = new THREE.Line( geometry, material );
    }

    update_label(){
        this.label.position.set( this.x, this.y+0.5, this.z);
    }

    update_sphere(radius){
        const sphereGeometry = new THREE.SphereGeometry( radius, 32, 16 );
        const sphereMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00, transparent: true, opacity: 0.2 } );
        this.show_sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.show_sphere.position.set(this.x, this.y, this.z);

        this.sphere = new THREE.Sphere(new THREE.Vector3(this.x, this.y, this.z), radius);
    }

}
