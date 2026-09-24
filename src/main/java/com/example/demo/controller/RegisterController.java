package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@org.springframework.context.annotation.Profile("practice")
@RestController
@RequestMapping("registernew")
public class RegisterController {
    @GetMapping
    public String hafiz(){
        return "hafiz";
    }

    @PostMapping
    public void register(@RequestParam String name,
                         @RequestParam String email,
                         @RequestParam String age,
                         @RequestParam String gender,
                         @RequestParam String[] skill
                         ){
        System.out.println(name+email+age+gender);
        System.out.println(Arrays.toString(skill));
    }
}
