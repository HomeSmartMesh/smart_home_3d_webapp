#!/bin/bash
sudo rm -rf /var/www/html/home
sudo cp -r . /var/www/html/home
sudo rm /var/www/html/home/deploy.sh
