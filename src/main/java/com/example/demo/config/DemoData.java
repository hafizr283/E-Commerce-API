package com.example.demo.config;

import com.example.demo.model.*;
import com.example.demo.repository.*;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
    name = "app.seed-demo",
    havingValue = "true")
public class DemoData {
  @Bean
  CommandLineRunner seed(
      UserRepository users, ProductRepository products, PasswordEncoder encoder) {
    return args -> {
      if (users.findByEmail("admin@atelier.local").isEmpty()) {
        User admin = new User();
        admin.setName("Store Admin");
        admin.setEmail("admin@atelier.local");
        admin.setPassword(encoder.encode("AdminDemo123!"));
        admin.setRole(User.Role.ADMIN);
        users.save(admin);
      }
      if (users.findByEmail("customer@atelier.local").isEmpty()) {
        User customer = new User();
        customer.setName("Alex Morgan");
        customer.setEmail("customer@atelier.local");
        customer.setPassword(encoder.encode("CustomerDemo123!"));
        customer.setRole(User.Role.USER);
        users.save(customer);
      }
      if (products.count() == 0) {
        String[][] catalog = {
          {
            "Everyday Tote",
            "A roomy cotton canvas tote with reinforced handles. Made for market mornings,"
                + " workdays, and everything in between.",
            "890",
            "24",
            "Everyday",
            "tote"
          },
          {
            "Arc Desk Lamp",
            "A sculptural, adjustable desk lamp with a warm LED glow and a powder-coated steel"
                + " shade. A softer light for focused evenings.",
            "3450",
            "12",
            "Workspace",
            "lamp"
          },
          {
            "Studio Headphones",
            "Over-ear wireless headphones with cushioned ear cups, balanced sound, and up to 30"
                + " hours of listening time.",
            "4250",
            "18",
            "Technology",
            "headphones"
          },
          {
            "Stoneware Mug",
            "A generously sized stoneware mug with a matte glaze and a comfortable handle."
                + " Dishwasher safe. Capacity: 350 ml.",
            "680",
            "40",
            "Home & Living",
            "mug"
          },
          {
            "Linen Notebook",
            "A cloth-bound notebook with 160 pages of smooth, dotted paper. Lay-flat binding keeps"
                + " your ideas moving.",
            "540",
            "35",
            "Workspace",
            "notebook"
          },
          {
            "Form Water Bottle",
            "A double-wall insulated steel bottle that keeps drinks cold for 24 hours. Leakproof"
                + " twist lid. Capacity: 600 ml.",
            "1290",
            "28",
            "Everyday",
            "bottle"
          },
          {
            "Pocket Speaker",
            "A compact Bluetooth speaker with clear, room-filling sound. USB-C charging and a woven"
                + " carrying loop for everyday adventures.",
            "2490",
            "15",
            "Technology",
            "speaker"
          },
          {
            "Organic Cotton Throw",
            "A breathable, textured cotton throw with a soft fringed edge. A little extra comfort"
                + " for slow mornings. 130 × 170 cm.",
            "2190",
            "16",
            "Home & Living",
            "throw"
          }
        };
        for (String[] row : catalog) {
          Product p = new Product();
          p.setName(row[0]);
          p.setDescription(row[1]);
          p.setPrice(new BigDecimal(row[2]));
          p.setStock(Integer.parseInt(row[3]));
          p.setCategory(row[4]);
          p.setImage("/assets/" + row[5] + ".svg");
          products.save(p);
        }
      }
    };
  }
}
